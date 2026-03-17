from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated

from .schemas import *

from core.database import database
from core.models.user import User
from api.jwt_auth import dependencies as auth_dp
from api.jwt_auth.utils import hash_password
from api.jwt_auth.crud import get_user_by_username
from . import crud


router = APIRouter(prefix="/api/admin", tags=["Admin"])


isAdmin = Annotated[User, Depends(auth_dp.is_admin)]


async def validate_schedule_relations(
    session: AsyncSession,
    *,
    group_id: int | None = None,
    teacher_id: int | None = None,
):
    if group_id is not None:
        group = await crud.get_group_by_id(session, group_id)
        if group is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

    if teacher_id is not None:
        teacher = await crud.get_user_by_id(session, teacher_id)
        if teacher is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher not found")


async def validate_schedule_conflict(
    session: AsyncSession,
    *,
    group_id: int,
    day_of_week: int,
    pair_number: int,
    week_type: str,
    date_from: date,
    date_to: date,
    exclude_id: int | None = None,
):
    conflicting_item = await crud.get_conflicting_schedule_item(
        session,
        group_id=group_id,
        day_of_week=day_of_week,
        pair_number=pair_number,
        week_type=week_type,
        date_from=date_from,
        date_to=date_to,
        exclude_id=exclude_id,
    )
    if conflicting_item is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Schedule conflict detected: another subject already exists for this group, "
                "day, pair number, week type, and date period"
            ),
        )

@router.get(
    "/teachers",
    response_model=list[UserOut],
    summary="Получить список преподавателей",
    description="Возвращает список преподавателей с пагинацией. Доступно только администратору.",
)
async def list_teachers(
    _: isAdmin,
    limit: int = 100,
    offset: int = 0,
    session: AsyncSession = Depends(database.get_session),
):
    return await crud.get_teachers(session, limit=limit, offset=offset)


@router.get(
    "/groups",
    response_model=list[GroupOut],
    summary="Получить список групп",
    description="Возвращает список групп с пагинацией. Доступно только администратору.",
)
async def list_groups(
    _: isAdmin,
    limit: int = 100,
    offset: int = 0,
    session: AsyncSession = Depends(database.get_session),
):
    return await crud.get_groups(session, limit=limit, offset=offset)


@router.get(
    "/groups/{group_id}",
    response_model=GroupOut,
    summary="Получить группу по ID",
    description="Возвращает группу по идентификатору. Доступно только администратору.",
)
async def get_group(
    group_id: int,
    _: isAdmin,
    session: AsyncSession = Depends(database.get_session),
):
    group = await crud.get_group_by_id(session, group_id)
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    return group


@router.post(
    "/groups",
    response_model=GroupOut,
    summary="Создать группу",
    description="Создает новую группу. Доступно только администратору.",
)
async def create_group(
    group_data: GroupCreate,
    _: isAdmin,
    session: AsyncSession = Depends(database.get_session),
):
    existing_group = await crud.get_group_by_name(session, group_data.name)
    if existing_group is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Group name already exists",
        )

    return await crud.create_group(session, group_data.name)


@router.patch(
    "/groups/{group_id}",
    response_model=GroupOut,
    summary="Обновить группу",
    description="Частично обновляет данные группы. Доступно только администратору.",
)
async def update_group(
    group_id: int,
    group_data: GroupUpdate,
    _: isAdmin,
    session: AsyncSession = Depends(database.get_session),
):
    current_group = await crud.get_group_by_id(session, group_id)
    if current_group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

    values = group_data.model_dump(exclude_unset=True)
    if "name" in values and values["name"] != current_group.name:
        existing_group = await crud.get_group_by_name(session, values["name"])
        if existing_group is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Group name already exists",
            )

    updated = await crud.update_group(session, group_id, values)
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    return updated


@router.delete(
    "/groups/{group_id}",
    summary="Удалить группу",
    description="Удаляет группу по идентификатору. Доступно только администратору.",
)
async def delete_group(
    group_id: int,
    _: isAdmin,
    session: AsyncSession = Depends(database.get_session),
):
    deleted = await crud.delete_group(session, group_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/users",
    response_model=list[UserOut],
    summary="Получить список пользователей",
    description="Возвращает список всех пользователей. Доступно только администратору.",
)
async def list_users(
    _: isAdmin,
    session: AsyncSession = Depends(database.get_session),
):
    return await crud.get_users(session)


@router.get(
    "/users/{user_id}",
    response_model=UserOut,
    summary="Получить пользователя по ID",
    description="Возвращает пользователя по идентификатору. Доступно только администратору.",
)
async def get_user(
    user_id: int,
    _: isAdmin,
    session: AsyncSession = Depends(database.get_session),
):
    user = await crud.get_user_by_id(session, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.post(
    "/users",
    response_model=UserOut,
    summary="Создать пользователя",
    description="Создает нового пользователя с указанной ролью. Доступно только администратору.",
)
async def create_user(
    user_data: UserCreate,
    _: isAdmin,
    session: AsyncSession = Depends(database.get_session),
):
    from api.jwt_auth.crud import get_user_by_username

    if await get_user_by_username(session, user_data.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists",
        )

    return await crud.create_user(
        session=session,
        username=user_data.username,
        hashed_password=hash_password(user_data.password),
        name=user_data.name,
        role=user_data.role,
    )


@router.patch(
    "/users/{user_id}",
    response_model=UserOut,
    summary="Обновить пользователя",
    description="Частично обновляет данные пользователя (username, password, name, role). Доступно только администратору.",
)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    _: isAdmin,
    session: AsyncSession = Depends(database.get_session),
):
    current_user = await crud.get_user_by_id(session, user_id)
    if current_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    values = user_data.model_dump(exclude_unset=True)
    if "password" in values:
        values["hashed_password"] = hash_password(values.pop("password"))

    if "username" in values and values["username"] != current_user.username:
        if await get_user_by_username(session, values["username"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists",
            )

    updated = await crud.update_user(session, user_id, values)
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return updated


@router.delete(
    "/users/{user_id}",
    summary="Удалить пользователя",
    description="Удаляет пользователя по идентификатору. Доступно только администратору.",
)
async def delete_user(
    user_id: int,
    _: isAdmin,
    session: AsyncSession = Depends(database.get_session),
):
    deleted = await crud.delete_user(session, user_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/schedule",
    response_model=list[ScheduleItemOut],
    summary="Получить список расписания",
    description="Возвращает все элементы расписания. Доступно только администратору.",
)
async def list_schedule_items(
    _: isAdmin,
    session: AsyncSession = Depends(database.get_session),
):
    return await crud.get_schedule_items(session)


@router.get(
    "/groups/{group_id}/schedule",
    response_model=list[ScheduleItemOut],
    summary="Получить расписание группы",
    description="Возвращает все элементы расписания для конкретной группы. Доступно только администратору.",
)
async def list_group_schedule_items(
    group_id: int,
    _: isAdmin,
    session: AsyncSession = Depends(database.get_session),
):
    group = await crud.get_group_by_id(session, group_id)
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

    return await crud.get_schedule_items_by_group(session, group_id)


@router.get(
    "/schedule/{schedule_item_id}",
    response_model=ScheduleItemOut,
    summary="Получить элемент расписания по ID",
    description="Возвращает элемент расписания по идентификатору. Доступно только администратору.",
)
async def get_schedule_item(
    schedule_item_id: int,
    _: isAdmin,
    session: AsyncSession = Depends(database.get_session),
):
    schedule_item = await crud.get_schedule_item_by_id(session, schedule_item_id)
    if schedule_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule item not found")
    return schedule_item


@router.post(
    "/schedule",
    response_model=ScheduleItemOut,
    summary="Создать элемент расписания",
    description="Создает новый элемент расписания. Доступно только администратору.",
)
async def create_schedule_item(
    schedule_item_data: ScheduleItemCreate,
    _: isAdmin,
    session: AsyncSession = Depends(database.get_session),
):
    await validate_schedule_relations(
        session,
        group_id=schedule_item_data.group_id,
        teacher_id=schedule_item_data.teacher_id,
    )
    await validate_schedule_conflict(
        session,
        group_id=schedule_item_data.group_id,
        day_of_week=schedule_item_data.day_of_week,
        pair_number=schedule_item_data.pair_number,
        week_type=schedule_item_data.week_type,
        date_from=schedule_item_data.date_from,
        date_to=schedule_item_data.date_to,
    )
    return await crud.create_schedule_item(
        session,
        schedule_item_data.model_dump(),
    )


@router.patch(
    "/schedule/{schedule_item_id}",
    response_model=ScheduleItemOut,
    summary="Обновить элемент расписания",
    description="Частично обновляет элемент расписания. Доступно только администратору.",
)
async def update_schedule_item(
    schedule_item_id: int,
    schedule_item_data: ScheduleItemUpdate,
    _: isAdmin,
    session: AsyncSession = Depends(database.get_session),
):
    current_item = await crud.get_schedule_item_by_id(session, schedule_item_id)
    if current_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule item not found")

    values = schedule_item_data.model_dump(exclude_unset=True)

    await validate_schedule_relations(
        session,
        group_id=values.get("group_id"),
        teacher_id=values.get("teacher_id"),
    )

    start_time = values.get("start_time", current_item.start_time)
    end_time = values.get("end_time", current_item.end_time)
    if end_time <= start_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End time must be greater than start time",
        )

    date_from = values.get("date_from", current_item.date_from)
    date_to = values.get("date_to", current_item.date_to)
    if date_to < date_from:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="date_to must be greater than or equal to date_from",
        )

    await validate_schedule_conflict(
        session,
        group_id=values.get("group_id", current_item.group_id),
        day_of_week=values.get("day_of_week", current_item.day_of_week),
        pair_number=values.get("pair_number", current_item.pair_number),
        week_type=values.get("week_type", current_item.week_type),
        date_from=date_from,
        date_to=date_to,
        exclude_id=schedule_item_id,
    )

    updated = await crud.update_schedule_item(session, schedule_item_id, values)
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule item not found")
    return updated


@router.delete(
    "/schedule/{schedule_item_id}",
    summary="Удалить элемент расписания",
    description="Удаляет элемент расписания по идентификатору. Доступно только администратору.",
)
async def delete_schedule_item(
    schedule_item_id: int,
    _: isAdmin,
    session: AsyncSession = Depends(database.get_session),
):
    deleted = await crud.delete_schedule_item(session, schedule_item_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule item not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
