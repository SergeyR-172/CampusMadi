import asyncio
from datetime import date, time, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.jwt_auth.utils import hash_password
from core.database import database
from core.models import Group, Note, ScheduleItem, User

TEST_GROUPS = [
    {"name": "SE-241"},
    {"name": "SE-242"},
]

TEST_USERS = [
    {
        "username": "test_admin",
        "password": "admin123",
        "name": "Test Admin",
        "role": "admin",
        "group": None,
    },
    {
        "username": "test_teacher",
        "password": "teacher123",
        "name": "Test Teacher",
        "role": "teacher",
        "group": None,
    },
    {
        "username": "test_teacher_2",
        "password": "teacher123",
        "name": "Test Teacher 2",
        "role": "teacher",
        "group": None,
    },
    {
        "username": "test_student_1",
        "password": "user123",
        "name": "Test Student 1",
        "role": "default",
        "group": "SE-241",
    },
    {
        "username": "test_student_2",
        "password": "user123",
        "name": "Test Student 2",
        "role": "default",
        "group": "SE-241",
    },
    {
        "username": "test_student_3",
        "password": "user123",
        "name": "Test Student 3",
        "role": "default",
        "group": "SE-242",
    },
]


def build_test_schedule(today: date, groups: dict[str, Group], users: dict[str, User]) -> list[dict]:
    monday = today - timedelta(days=today.isoweekday() - 1)
    date_from = monday - timedelta(days=14)
    date_to = monday + timedelta(days=42)

    return [
        {
            "subject": "Mathematics",
            "group_id": groups["SE-241"].id,
            "teacher_id": users["test_teacher"].id,
            "day_of_week": 1,
            "pair_number": 1,
            "week_type": "both",
            "start_time": time(9, 0),
            "end_time": time(10, 30),
            "date_from": date_from,
            "date_to": date_to,
        },
        {
            "subject": "Physics",
            "group_id": groups["SE-241"].id,
            "teacher_id": users["test_teacher_2"].id,
            "day_of_week": 3,
            "pair_number": 2,
            "week_type": "both",
            "start_time": time(10, 40),
            "end_time": time(12, 10),
            "date_from": date_from,
            "date_to": date_to,
        },
        {
            "subject": "Programming",
            "group_id": groups["SE-242"].id,
            "teacher_id": users["test_teacher"].id,
            "day_of_week": 2,
            "pair_number": 1,
            "week_type": "both",
            "start_time": time(9, 0),
            "end_time": time(10, 30),
            "date_from": date_from,
            "date_to": date_to,
        },
    ]


def build_test_notes(users: dict[str, User], schedule_items: dict[tuple[int, str, int], ScheduleItem]) -> list[dict]:
    se241_math = schedule_items[(users["test_teacher"].id, "Mathematics", 1)]
    se241_physics = schedule_items[(users["test_teacher_2"].id, "Physics", 2)]
    se242_programming = schedule_items[(users["test_teacher"].id, "Programming", 1)]

    return [
        {
            "author_id": users["test_teacher"].id,
            "schedule_item_id": se241_math.id,
            "text": "Bring lecture notebook and calculator.",
            "private": False,
        },
        {
            "author_id": users["test_teacher"].id,
            "schedule_item_id": se241_math.id,
            "text": "We will also have a short quiz at the beginning of the class.",
            "private": True,
        },
        {
            "author_id": users["test_student_1"].id,
            "schedule_item_id": se241_math.id,
            "text": "Need to review integrals before class.",
            "private": False,
        },
        {
            "author_id": users["test_student_2"].id,
            "schedule_item_id": se241_physics.id,
            "text": "Prepare lab report draft.",
            "private": False,
        },
        {
            "author_id": users["test_teacher"].id,
            "schedule_item_id": se242_programming.id,
            "text": "First practical lesson will cover FastAPI basics.",
            "private": True,
        },
        {
            "author_id": users["test_student_3"].id,
            "schedule_item_id": se242_programming.id,
            "text": "Check repository access before practice.",
            "private": False,
        },
    ]


async def get_or_create_group(session: AsyncSession, name: str) -> Group:
    stmt = select(Group).where(Group.name == name)
    result = await session.execute(stmt)
    group = result.scalars().first()

    if group is not None:
        print(f"[SKIP] Group '{name}' already exists")
        return group

    group = Group(name=name)
    session.add(group)
    await session.flush()
    print(f"[CREATE] group='{name}'")
    return group


async def get_or_create_user(
    session: AsyncSession,
    *,
    username: str,
    password: str,
    name: str,
    role: str,
    group_id: int | None,
) -> User:
    stmt = select(User).where(User.username == username)
    result = await session.execute(stmt)
    user = result.scalars().first()

    if user is not None:
        changed = False
        if user.name != name:
            user.name = name
            changed = True
        if user.role != role:
            user.role = role
            changed = True
        if user.group_id != group_id:
            user.group_id = group_id
            changed = True

        if changed:
            await session.flush()
            print(f"[UPDATE] username='{username}' synchronized for tests")
        else:
            print(f"[SKIP] User '{username}' already exists")
        return user

    user = User(
        username=username,
        hashed_password=hash_password(password),
        name=name,
        role=role,
        group_id=group_id,
    )
    session.add(user)
    await session.flush()
    print(
        f"[CREATE] username='{username}', password='{password}', role='{role}', group_id='{group_id}'"
    )
    return user


async def get_or_create_schedule_item(session: AsyncSession, values: dict) -> ScheduleItem:
    stmt = select(ScheduleItem).where(
        ScheduleItem.group_id == values["group_id"],
        ScheduleItem.teacher_id == values["teacher_id"],
        ScheduleItem.subject == values["subject"],
        ScheduleItem.day_of_week == values["day_of_week"],
        ScheduleItem.pair_number == values["pair_number"],
    )
    result = await session.execute(stmt)
    schedule_item = result.scalars().first()

    if schedule_item is not None:
        changed = False
        for key, value in values.items():
            if getattr(schedule_item, key) != value:
                setattr(schedule_item, key, value)
                changed = True

        if changed:
            await session.flush()
            print(
                f"[UPDATE] Schedule '{values['subject']}' for group_id={values['group_id']} synchronized"
            )
        else:
            print(
                f"[SKIP] Schedule '{values['subject']}' for group_id={values['group_id']} already exists"
            )
        return schedule_item

    schedule_item = ScheduleItem(**values)
    session.add(schedule_item)
    await session.flush()
    print(
        f"[CREATE] schedule subject='{values['subject']}', group_id={values['group_id']}, pair={values['pair_number']}'"
    )
    return schedule_item


async def get_or_create_note(session: AsyncSession, values: dict) -> Note:
    stmt = select(Note).where(
        Note.author_id == values["author_id"],
        Note.schedule_item_id == values["schedule_item_id"],
        Note.text == values["text"],
    )
    result = await session.execute(stmt)
    note = result.scalars().first()

    if note is not None:
        if note.private != values["private"]:
            note.private = values["private"]
            await session.flush()
            print(
                f"[UPDATE] note privacy for schedule_item_id={values['schedule_item_id']} by author_id={values['author_id']} synchronized"
            )
            return note
        print(
            f"[SKIP] Note for schedule_item_id={values['schedule_item_id']} by author_id={values['author_id']} already exists"
        )
        return note

    note = Note(**values)
    session.add(note)
    await session.flush()
    print(
        f"[CREATE] note for schedule_item_id={values['schedule_item_id']} by author_id={values['author_id']}"
    )
    return note


async def create_test_users() -> None:
    async with database.session_fabric() as session:
        groups_by_name: dict[str, Group] = {}
        for group_data in TEST_GROUPS:
            group = await get_or_create_group(session, group_data["name"])
            groups_by_name[group.name] = group

        users_by_username: dict[str, User] = {}
        for user_data in TEST_USERS:
            group_name = user_data["group"]
            group_id = groups_by_name[group_name].id if group_name is not None else None
            user = await get_or_create_user(
                session,
                username=user_data["username"],
                password=user_data["password"],
                name=user_data["name"],
                role=user_data["role"],
                group_id=group_id,
            )
            users_by_username[user.username] = user

        schedule_by_key: dict[tuple[int, str, int], ScheduleItem] = {}
        for schedule_data in build_test_schedule(date.today(), groups_by_name, users_by_username):
            schedule_item = await get_or_create_schedule_item(session, schedule_data)
            schedule_by_key[
                (
                    schedule_item.teacher_id,
                    schedule_item.subject,
                    schedule_item.pair_number,
                )
            ] = schedule_item

        for note_data in build_test_notes(users_by_username, schedule_by_key):
            await get_or_create_note(session, note_data)

        await session.commit()

        print("\n[READY] Test data prepared:")
        print("  admin    -> test_admin / admin123")
        print("  teachers -> test_teacher / teacher123, test_teacher_2 / teacher123")
        print("  students -> test_student_1 / user123, test_student_2 / user123, test_student_3 / user123")
        print("  groups   -> SE-241, SE-242")
        print("  notes    -> linked to schedule items for teachers and students")


if __name__ == "__main__":
    asyncio.run(create_test_users())
