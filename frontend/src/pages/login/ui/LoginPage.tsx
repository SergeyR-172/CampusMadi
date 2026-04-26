import { useNavigate } from "@tanstack/react-router";

import { LoginForm } from "#/features/auth";
import type { UserSchema } from "#/shared/api";

export const LoginPage = () => {
  const navigate = useNavigate();

  const handleSuccess = (user: UserSchema) => {
    if (user.role === "admin") {
      navigate({ to: "/admin" });
    } else {
      navigate({ to: "/" });
    }
  };

  return (
    <div className="bg-app-bg flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-208.5">
        {/* Синий баннер */}
        <div className="bg-brand flex items-center gap-6 rounded-t-[31px] px-10 py-8">
          <div className="flex items-center w-full justify-between gap-4">
            <div>
              <p
                className="text-[55px] leading-none font-semibold text-white"
                style={{ fontFamily: "Roboto, sans-serif" }}
              >
                Campus Madi
              </p>
              <p
                className="mt-1 text-sm text-white/70"
                style={{ fontFamily: "Roboto, sans-serif" }}
              >
                Система управления расписанием
              </p>
            </div>
            <img src="/logo.svg" alt="Campus Madi logo" className="shrink-0" />
          </div>
        </div>

        {/* Форма */}
        <div className="rounded-b-[22px] bg-white px-10 py-10 shadow-sm">
          <LoginForm onSuccess={handleSuccess} />
        </div>
      </div>
    </div>
  );
};
