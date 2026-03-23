from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.jwt_auth.router import router as jwt_router
from api.admin.router import router as admin_router
from api.notes.router import router as notes_router
from api.schedule.router import router as schedule_router
import uvicorn

app = FastAPI(
    title="CampusMadi Backend API",
    description="API для работы с расписанием и заметками к нему.",
    version="0.8.1",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(jwt_router)
app.include_router(admin_router)
app.include_router(notes_router)
app.include_router(schedule_router)

@app.get(
    "/healthcheck",
    tags=["Healthcheck"],
    summary="Проверка работоспособности сервера",
    description="Возвращает статус сервера, чтобы убедиться, что приложение запущено и отвечает.",
)
def healthcheck():
    return {"message": "server is ok"}

if __name__ == "__main__":
    uvicorn.run("main:app", reload=True, host="0.0.0.0", port=8000)
