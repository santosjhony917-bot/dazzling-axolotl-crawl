import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function CustomerSignup() {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);

  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };

  const toggleConfirmPasswordVisibility = () => {
    setConfirmPasswordVisible(!confirmPasswordVisible);
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-x-hidden bg-[#f5f7f8] p-4">
      <header className="flex flex-col items-center justify-center pt-16 pb-6 w-full max-w-sm">
        <img
          alt="FilterFood logo"
          className="w-36 h-auto drop-shadow-md"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDaPbXmzvKkbF2Pc_SLWOOR5kIgogIIMYMAkCwUoWS563947iWScJV79Q3cKk8gIMBuOGqZE9gcpBUNkNYytQ5Q3ARQT1kbsJfGWFRoqFSxAvBuKWkqm3K8uEV6RJY8dPeGlpFDNsD4CAPfS-uV-nqQiWsPY3u4TqjuIYxlkPjUDvFsn5mFz5TVbtCvE6YyyE_0cJqXduk10h9zn6AAv-Sgvp20z2iyDCrnk-1ExzxOaSt1WUI0EDvNLnI9kW-JylHQYF6UBMiVaCDf"
        />
      </header>

      <main className="flex-1 flex flex-col justify-center w-full max-w-sm">
        <Card className="w-full shadow-xl border-none rounded-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-[#022D68] tracking-tight text-4xl font-extrabold leading-tight">
              Crie sua conta
            </CardTitle>
            <CardDescription className="text-gray-600 text-lg font-medium leading-normal pt-2">
              Comece a explorar os melhores restaurantes!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Input
                className="h-14 text-base"
                placeholder="E-mail"
                type="email"
              />
              <div className="relative">
                <Input
                  className="h-14 text-base pr-12"
                  placeholder="Senha"
                  type={passwordVisible ? "text" : "password"}
                />
                <button
                  onClick={togglePasswordVisibility}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 hover:text-[#E47948] transition-colors"
                  type="button"
                >
                  {passwordVisible ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <div className="relative">
                <Input
                  className="h-14 text-base pr-12"
                  placeholder="Confirmar Senha"
                  type={confirmPasswordVisible ? "text" : "password"}
                />
                <button
                  onClick={toggleConfirmPasswordVisibility}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 hover:text-[#E47948] transition-colors"
                  type="button"
                >
                  {confirmPasswordVisible ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <Button className="w-full bg-[#E47948] text-white font-bold py-3.5 h-auto text-lg hover:bg-[#E47948]/90 rounded-lg shadow-lg shadow-[#E47948]/50">
                Criar conta
              </Button>

              <div className="relative flex items-center justify-center pt-2">
                <div className="absolute w-full border-t border-gray-300"></div>
                <span className="bg-white px-3 text-sm text-gray-500 z-10">
                  ou
                </span>
              </div>

              <Button
                variant="outline"
                className="w-full h-auto py-3.5 text-base font-semibold"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5 mr-2">
                  <path fill="#EA4335" d="M24 9.5c3.94 0 7.1 1.64 9.26 3.02l6.84-6.84C36.49 2.34 30.71 0 24 0 14.64 0 6.6 5.4 2.69 13.22l7.97 6.19C12.23 13.66 17.66 9.5 24 9.5z"/>
                  <path fill="#34A853" d="M46.1 24.5c0-1.64-.15-3.21-.44-4.74H24v9h12.45c-.54 2.9-2.16 5.36-4.58 7.06l7.02 5.45c4.12-3.8 6.46-9.4 6.46-16.77z"/>
                  <path fill="#FBBC05" d="M10.66 28.41a14.44 14.44 0 010-8.82l-7.97-6.19A23.94 23.94 0 000 24c0 3.86.92 7.5 2.69 10.6l7.97-6.19z"/>
                  <path fill="#4285F4" d="M24 48c6.48 0 11.92-2.13 15.89-5.79l-7.02-5.45C30.76 38.18 27.68 39.5 24 39.5c-6.34 0-11.77-4.16-13.34-9.81l-7.97 6.19C6.6 42.6 14.64 48 24 48z"/>
                </svg>
                Continuar com Google
              </Button>
              <Button
                variant="outline"
                className="w-full h-auto py-3.5 text-base font-semibold"
              >
                <i className="fa-brands fa-apple w-5 h-5 mr-2"></i>
                Continuar com Apple
              </Button>
            </div>

            <p className="pt-6 text-center text-base text-gray-600">
              Já tem uma conta?
              <Link
                to="/restaurant-login"
                className="font-bold text-[#E47948] hover:underline ml-1"
              >
                Entrar
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}