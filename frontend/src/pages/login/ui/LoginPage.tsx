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
    <div className="bg-app-bg min-h-screen">
      {/* Mobile layout */}
      <div className="flex min-h-screen flex-col md:hidden">
        <div
          className="mx-[11px] mt-[25px] flex h-[117px] shrink-0 items-center justify-between rounded-[20px] px-5"
          style={{ background: "linear-gradient(0deg, #2985EF 0%, #0B63CE 100%)" }}
        >
          <p
            className="text-[35px] font-semibold leading-none text-white"
            style={{ fontFamily: "Roboto, sans-serif" }}
          >
            Campus Madi
          </p>
          <img src="/logo.svg" alt="Campus Madi logo" className="h-[77px] shrink-0" />
        </div>

        <div className="flex-1" />

        <div className="mx-[12px] mb-6 rounded-[20px] bg-white px-[29px] py-[22px] shadow-sm">
          <LoginForm onSuccess={handleSuccess} />
        </div>
      </div>

      {/* Desktop layout */}
      <div className="hidden min-h-screen items-center justify-center px-4 md:flex">
        <div className="w-full max-w-208.5">
          <div className="bg-brand flex items-center gap-6 rounded-t-[31px] px-10 py-8">
            <div className="flex w-full items-center justify-between gap-4">
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

          <div className="rounded-b-[22px] bg-white px-10 py-10 shadow-sm">
            <LoginForm onSuccess={handleSuccess} />
          </div>
        </div>
      </div>
    </div>
  );
};
