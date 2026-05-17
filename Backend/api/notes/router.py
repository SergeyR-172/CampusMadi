from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date

from api.jwt_auth.dependencies import get_current_payload
from api.jwt_auth.schemas import AuthUserPayload
from core.database import database

from . import crud
from .schemas import NoteCreate, NoteOut, NoteUpdate

router = APIRouter(prefix="/api/notes", tags=["Notes"])


def is_teacher(payload: AuthUserPayload) -> bool:
    return payload.role == "teacher"


def normalize_private_flag(payload: AuthUserPayload, private: bool) -> bool:
    return private if is_teacher(payload) else False


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


@router.get(
    "",
    response_model=list[NoteOut],
    summary="Получить заметки текущего пользователя",
    description="Возвращает заметки текущего пользователя. Можно отфильтровать по занятию через schedule_item_id.",
)
async def list_notes(
    payload: AuthUserPayload = Depends(get_current_payload),
    session: AsyncSession = Depends(database.get_session),
    schedule_item_id: int | None = None,
    lesson_date: date | None = None,
):
    if schedule_item_id is not None:
        schedule_item = await crud.get_schedule_item_by_id(session, schedule_item_id)
        if schedule_item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule item not found")

        if is_teacher(payload):
            if schedule_item.teacher_id != payload.sub:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Teacher cannot manage notes for another teacher's lesson",
                )
        elif payload.group_id is None or schedule_item.group_id != payload.group_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User cannot manage notes for this lesson",
            )

        if lesson_date is not None:
            ensure_lesson_date_matches_schedule_item(schedule_item, lesson_date)

    return await crud.get_notes_by_author(session, payload.sub, schedule_item_id, lesson_date)


@router.get(
    "/{note_id}",
    response_model=NoteOut,
    summary="Получить заметку по ID",
    description="Возвращает заметку текущего пользователя по идентификатору.",
)
async def get_note(
    note_id: int,
    payload: AuthUserPayload = Depends(get_current_payload),
    session: AsyncSession = Depends(database.get_session),
):
    note = await crud.get_note_by_id(session, note_id)
    if note is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")

    if note.author_id != payload.sub:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User cannot manage another user's note",
        )

    if note.schedule_item_id is not None:
        schedule_item = await crud.get_schedule_item_by_id(session, note.schedule_item_id)
        if schedule_item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule item not found")

        if is_teacher(payload):
            if schedule_item.teacher_id != payload.sub:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Teacher cannot manage notes for another teacher's lesson",
                )
        elif payload.group_id is None or schedule_item.group_id != payload.group_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User cannot manage notes for this lesson",
            )

    return note


@router.post(
    "",
    response_model=NoteOut,
    status_code=status.HTTP_201_CREATED,
    summary="Создать заметку",
    description="Создает заметку текущего пользователя для занятия. Преподаватель может иметь две заметки на занятие: публичную и приватную.",
)
async def create_note(
    note_in: NoteCreate,
    payload: AuthUserPayload = Depends(get_current_payload),
    session: AsyncSession = Depends(database.get_session),
):
    schedule_item = await crud.get_schedule_item_by_id(session, note_in.schedule_item_id)
    if schedule_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule item not found")
    ensure_lesson_date_matches_schedule_item(schedule_item, note_in.lesson_date)

    if is_teacher(payload):
        if schedule_item.teacher_id != payload.sub:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Teacher cannot manage notes for another teacher's lesson",
            )
    elif payload.group_id is None or schedule_item.group_id != payload.group_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User cannot manage notes for this lesson",
        )

    #Нормализация приватности заметки (по бизнес правилу 2 заметки может быть только у учителя)
    private = normalize_private_flag(payload, note_in.private)
    existing_note = await crud.get_note_for_slot(
        session,
        author_id=payload.sub,
        schedule_item_id=schedule_item.id,
        lesson_date=note_in.lesson_date,
        is_teacher=is_teacher(payload),
        private=private,
    )
    if existing_note is not None:
        if is_teacher(payload):
            detail = "Teacher already has a note with this visibility for the lesson"
        else:
            detail = "User already has a note for the lesson"
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)

    return await crud.create_note(
        session,
        {
            "author_id": payload.sub,
            "schedule_item_id": note_in.schedule_item_id,
            "lesson_date": note_in.lesson_date,
            "text": note_in.text,
            "private": private,
        },
    )


@router.patch(
    "/{note_id}",
    response_model=NoteOut,
    summary="Обновить заметку",
    description="Частично обновляет заметку текущего пользователя. Для преподавателя учитывается ограничение на одну публичную и одну приватную заметку на занятие.",
)
async def update_note(
    note_id: int,
    note_in: NoteUpdate,
    payload: AuthUserPayload = Depends(get_current_payload),
    session: AsyncSession = Depends(database.get_session),
):
    note = await crud.get_note_by_id(session, note_id)
    if note is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")

    if note.author_id != payload.sub:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User cannot manage another user's note",
        )

    values = note_in.model_dump(exclude_unset=True)

    if "private" in values:
        values["private"] = normalize_private_flag(payload, values["private"])

    target_private = values.get("private", note.private)
    if note.schedule_item_id is not None:
        schedule_item = await crud.get_schedule_item_by_id(session, note.schedule_item_id)
        if schedule_item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule item not found")

        if is_teacher(payload):
            if schedule_item.teacher_id != payload.sub:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Teacher cannot manage notes for another teacher's lesson",
                )
        elif payload.group_id is None or schedule_item.group_id != payload.group_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User cannot manage notes for this lesson",
            )

        existing_note = await crud.get_note_for_slot(
            session,
            author_id=payload.sub,
            schedule_item_id=note.schedule_item_id,
            lesson_date=note.lesson_date,
            is_teacher=is_teacher(payload),
            private=target_private,
            exclude_id=note.id,
        )
        if existing_note is not None:
            if is_teacher(payload):
                detail = "Teacher already has a note with this visibility for the lesson"
            else:
                detail = "User already has a note for the lesson"
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)

    return await crud.update_note(session, note_id, values)


@router.delete(
    "/{note_id}",
    summary="Удалить заметку",
    description="Удаляет заметку текущего пользователя по идентификатору.",
)
async def delete_note(
    note_id: int,
    payload: AuthUserPayload = Depends(get_current_payload),
    session: AsyncSession = Depends(database.get_session),
):
    note = await crud.get_note_by_id(session, note_id)
    if note is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")

    if note.author_id != payload.sub:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User cannot manage another user's note",
        )

    if note.schedule_item_id is not None:
        schedule_item = await crud.get_schedule_item_by_id(session, note.schedule_item_id)
        if schedule_item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule item not found")

        if is_teacher(payload):
            if schedule_item.teacher_id != payload.sub:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Teacher cannot manage notes for another teacher's lesson",
                )
        elif payload.group_id is None or schedule_item.group_id != payload.group_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User cannot manage notes for this lesson",
            )

    await crud.delete_note(session, note_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
