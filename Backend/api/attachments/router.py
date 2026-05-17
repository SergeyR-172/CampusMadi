from datetime import date
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from api.jwt_auth.dependencies import get_current_payload
from api.jwt_auth.schemas import AuthUserPayload
from core.database import database
from core.settings import settings

from . import crud
from .schemas import AttachmentOut


router = APIRouter(prefix="/api/attachments", tags=["Attachments"])

MAX_UPLOAD_SIZE = 25 * 1024 * 1024


def is_teacher(payload: AuthUserPayload) -> bool:
    return payload.role == "teacher"


def is_schedule_item_on_date(schedule_item, lesson_date: date) -> bool:
    if lesson_date < schedule_item.date_from or lesson_date > schedule_item.date_to:
        return False

    if lesson_date.isoweekday() != schedule_item.day_of_week:
        return False

    week_type = "even" if lesson_date.isocalendar().week % 2 == 0 else "odd"
    return schedule_item.week_type in (week_type, "both")


def ensure_lesson_date_matches_schedule_item(schedule_item, lesson_date: date) -> None:
    if not is_schedule_item_on_date(schedule_item, lesson_date):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lesson date does not match this schedule item",
        )


def ensure_can_view_lesson(payload: AuthUserPayload, schedule_item) -> None:
    if is_teacher(payload):
        if schedule_item.teacher_id != payload.sub:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Teacher cannot view attachments for another teacher's lesson",
            )
    elif payload.group_id is None or schedule_item.group_id != payload.group_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User cannot view attachments for this lesson",
        )


def ensure_can_upload_to_lesson(payload: AuthUserPayload, schedule_item) -> None:
    if not is_teacher(payload):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teacher can upload lesson attachments",
        )

    if schedule_item.teacher_id != payload.sub:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Teacher cannot upload attachments for another teacher's lesson",
        )


def build_attachment_dir(schedule_item_id: int, lesson_date: date) -> Path:
    return (
        settings.upload_dir
        / "lesson_attachments"
        / str(schedule_item_id)
        / lesson_date.isoformat()
    )


async def save_upload_file(file: UploadFile, destination: Path) -> int:
    size = 0
    destination.parent.mkdir(parents=True, exist_ok=True)

    with destination.open("wb") as output:
        while chunk := await file.read(1024 * 1024):
            size += len(chunk)
            if size > MAX_UPLOAD_SIZE:
                output.close()
                destination.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail="File is too large",
                )
            output.write(chunk)

    return size


@router.post(
    "",
    response_model=AttachmentOut,
    status_code=status.HTTP_201_CREATED,
    summary="Загрузить файл к занятию",
    description=(
        "Загружает файл к конкретному занятию по schedule_item_id и lesson_date. "
        "Файл может загрузить только преподаватель, который ведет это занятие. "
        "Дата должна соответствовать элементу расписания."
    ),
)
async def upload_attachment(
    schedule_item_id: int = Form(gt=0),
    lesson_date: date = Form(),
    file: UploadFile = File(),
    payload: AuthUserPayload = Depends(get_current_payload),
    session: AsyncSession = Depends(database.get_session),
):
    schedule_item = await crud.get_schedule_item_by_id(session, schedule_item_id)
    if schedule_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule item not found")

    ensure_lesson_date_matches_schedule_item(schedule_item, lesson_date)
    ensure_can_upload_to_lesson(payload, schedule_item)

    original_filename = Path(file.filename or "attachment").name
    stored_filename = f"{uuid4().hex}_{original_filename}"
    destination = build_attachment_dir(schedule_item_id, lesson_date) / stored_filename
    size = await save_upload_file(file, destination)

    try:
        return await crud.create_attachment(
            session,
            {
                "schedule_item_id": schedule_item_id,
                "lesson_date": lesson_date,
                "teacher_id": payload.sub,
                "original_filename": original_filename,
                "stored_filename": stored_filename,
                "storage_path": str(destination.relative_to(settings.upload_dir)),
                "content_type": file.content_type or "application/octet-stream",
                "size": size,
            },
        )
    except Exception:
        destination.unlink(missing_ok=True)
        raise


@router.get(
    "",
    response_model=list[AttachmentOut],
    summary="Получить файлы занятия",
    description=(
        "Возвращает список файлов, прикрепленных к конкретному занятию по "
        "schedule_item_id и lesson_date. Преподаватель видит файлы своих занятий, "
        "студент видит файлы занятий своей группы."
    ),
)
async def list_attachments(
    schedule_item_id: int = Query(gt=0),
    lesson_date: date = Query(),
    payload: AuthUserPayload = Depends(get_current_payload),
    session: AsyncSession = Depends(database.get_session),
):
    schedule_item = await crud.get_schedule_item_by_id(session, schedule_item_id)
    if schedule_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule item not found")

    ensure_lesson_date_matches_schedule_item(schedule_item, lesson_date)
    ensure_can_view_lesson(payload, schedule_item)

    return await crud.get_attachments_for_lesson(
        session,
        schedule_item_id=schedule_item_id,
        lesson_date=lesson_date,
    )


@router.get(
    "/{attachment_id}/download",
    summary="Скачать файл занятия",
    description=(
        "Возвращает прикрепленный файл по ID. Доступ разрешен преподавателю этого "
        "занятия и студентам группы, к которой относится занятие."
    ),
)
async def download_attachment(
    attachment_id: int,
    payload: AuthUserPayload = Depends(get_current_payload),
    session: AsyncSession = Depends(database.get_session),
):
    attachment = await crud.get_attachment_by_id(session, attachment_id)
    if attachment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found")

    schedule_item = await crud.get_schedule_item_by_id(session, attachment.schedule_item_id)
    if schedule_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule item not found")

    ensure_can_view_lesson(payload, schedule_item)

    path = settings.upload_dir / attachment.storage_path
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment file not found")

    return FileResponse(
        path,
        media_type=attachment.content_type,
        filename=attachment.original_filename,
    )


@router.delete(
    "/{attachment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Удалить файл занятия",
    description=(
        "Удаляет прикрепленный файл по ID из базы данных и локального хранилища. "
        "Удалять файл может только преподаватель, который ведет это занятие."
    ),
)
async def delete_attachment(
    attachment_id: int,
    payload: AuthUserPayload = Depends(get_current_payload),
    session: AsyncSession = Depends(database.get_session),
):
    attachment = await crud.get_attachment_by_id(session, attachment_id)
    if attachment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found")

    schedule_item = await crud.get_schedule_item_by_id(session, attachment.schedule_item_id)
    if schedule_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule item not found")

    ensure_can_upload_to_lesson(payload, schedule_item)

    path = settings.upload_dir / attachment.storage_path
    await crud.delete_attachment(session, attachment_id)
    path.unlink(missing_ok=True)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
