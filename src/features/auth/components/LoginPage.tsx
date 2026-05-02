import { AppProviders } from "@/components/providers/AppProviders";
import { LoginForm } from "@/features/auth/components/LoginForm";
import Logo from "@/assets/images/logo.png";

export function LoginPage() {
  return (
    <AppProviders>
      <section className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-7xl items-stretch gap-8 lg:grid-cols-2 lg:gap-0">
          <div className="flex min-h-136 items-center justify-center rounded-[2.5rem] border border-border bg-card/80 px-8 py-14 text-center shadow-sm ring-1 ring-primary/5 backdrop-blur-sm sm:px-12 sm:py-16 lg:min-h-136 lg:rounded-r-none lg:border-r-0">
            <div className="flex w-full max-w-none flex-col items-center justify-center text-center">
              <img src={Logo.src} alt="XD Gestión" className="h-32 w-auto sm:h-40" />

              <div className="mt-10 space-y-3">
                <h1 className="text-3xl font-semibold tracking-tight text-primary sm:text-4xl">
                  Ilustración digital con identidad y precisión.
                </h1>
                <p className="mx-auto max-w-lg text-sm leading-6 text-muted-foreground sm:text-base">
                  Creamos piezas visuales que conectan marca, concepto y detalle en una sola experiencia.
                </p>
                <p className="mx-auto max-w-lg text-sm leading-6 text-muted-foreground sm:text-base">
                  Del boceto al acabado final, damos forma a ideas con estilo, coherencia y un lenguaje visual profesional.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center rounded-[2.5rem] border border-border bg-card/60 px-6 py-10 shadow-sm ring-1 ring-primary/5 backdrop-blur-sm lg:min-h-136 lg:rounded-l-none lg:border-l-0">
            <LoginForm />
          </div>
        </div>
      </section>
    </AppProviders>
  );
}
