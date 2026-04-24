import { useNavigate } from "@tanstack/react-router";

import { useAuthStore } from "#/entities/user";
import { LoginForm } from "#/features/auth";

export const LoginPage = () => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    const role = useAuthStore.getState().user?.role;
    if (role === "admin") {
      navigate({ to: "/admin" });
    } else {
      navigate({ to: "/" });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-app-bg px-4">
      <div className="w-full max-w-208.5">
        {/* Синий баннер */}
        <div className="flex items-center gap-6 rounded-t-[31px] bg-brand px-10 py-8">
          <div className="flex items-center gap-4">
            <svg
              width="80"
              height="58"
              viewBox="0 0 80 58"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="shrink-0"
            >
              <rect x="0" y="8" width="56" height="10" rx="2" fill="white" />
              <rect x="0" y="0" width="80" height="37" rx="4" fill="white" fillOpacity="0.15" />
              <rect x="4" y="4" width="72" height="29" rx="3" fill="white" fillOpacity="0.25" />
              <circle cx="12" cy="18" r="5" fill="white" />
              <rect x="22" y="14" width="46" height="4" rx="2" fill="white" />
              <rect x="22" y="21" width="32" height="3" rx="1.5" fill="white" fillOpacity="0.7" />
              <rect x="0" y="44" width="78" height="14" rx="4" fill="white" fillOpacity="0.2" />
              <rect x="8" y="48" width="66" height="6" rx="3" fill="white" fillOpacity="0.5" />
            </svg>
            <div>
              <p
                className="text-[55px] font-semibold leading-none text-white"
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
