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
        <div className="w-36 h-auto drop-shadow-md">
          <svg viewBox="0 0 350 183.6">
            <g transform="matrix(-1.022,0,0,1.022,227.94,-1.794)" fill="#e47948">
              <path d="M51.8,25.5c-5.8,0-10.5,4.7-10.5,10.5c0,5,4,14.1,10.5,14.1c6.5,0,10.5-9.1,10.5-14.1C62.3,30.2,57.6,25.5,51.8,25.5z M51.8,44.6c-2,0-5-5.2-5-8.6c0-2.7,2.2-5,5-5s5,2.2,5,5C56.8,39.5,53.8,44.6,51.8,44.6z"></path>
              <path d="M82.9,50.3c2.1-4.5,3.2-9.3,3.2-14.3c0-18.9-15.4-34.3-34.2-34.3c-18.9,0-34.2,15.4-34.2,34.3c0,4.2,0.8,8.2,2.2,12c0.6,1.6,3.3,7.4,8.8,13c0.2,0.2,0.4,0.4,0.6,0.6l19.7,20.9c0,0,3.1,3,5.9,0l3.7-3.9h10.8c0.9,0.1,2.1,0.5,2.6,2c0,0,0,0,0,0l3,7.9h-11c0,0,0,0,0,0l0.2,0.6c0.3,1.1,0.4,3.5-4.7,3.5H31.9c-4.3,0-3.8-2.4-3.6-3.1l3.1-8.2c0-0.1,0.1-0.2,0.2-0.4c0.7-1.8,1.4-2.3,1.8-2.4h2.1c3,0,0.7-2.5,0.7-2.5h0l-1.1-1.1c0,0,0,0,0,0c-1.4-1.5-3.1-1.8-4.1-1.9h-1c-0.6,0.1-1.7,0.7-2.6,3l-6.3,16.7c0,0-1.4,5.4,7.1,5.4h46.5c0,0,9-1.1,6.5-7.8l-4.7-12.5c0,0,0,0,0,0c-1.3-3.5-5-3.5-5-3.5h-7.6l10.9-11.6l3.6-3.8C80.4,54.9,81.9,52.2,82.9,50.3z M54.5,74.8c0,0,0,0,0,0c-2.4,2.5-4.4,0.9-5.1,0.3l-0.2-0.3c0,0,0,0,0,0L33.1,57.8l-0.2-0.2c-1.3-1.2-2.6-2.5-3.7-3.9l-0.3-0.4c-3.9-5.1-5.9-11.1-5.9-17.4c0-15.9,12.9-28.7,28.7-28.7c15.8,0,28.7,12.9,28.7,28.7c0,6.3-2,12.3-5.9,17.4L54.5,74.8z"></path>
            </g>
            <g transform="matrix(2.225,0,0,2.225,-5.072,94.083)" fill="#032d63">
              <path d="M2.3,15.5h18.2v5.6H8.3v3.9h9.8v5.6H8.3v9.4H2.3V15.5z M20.9,20h6v20h-6V20z M23.9,18.1c-2,0-3.5-1.4-3.5-3.5c0-2.1,1.4-3.4,3.5-3.4c2.1,0,3.4,1.4,3.4,3.4C27.4,16.7,26,18.1,23.9,18.1z M28.4,12h6v28h-6V12z M47.5,20.7v5.6h-5.6v3.8c0,3.1,2,4.6,5,4.6c0.4,0,0.7,0,1,0s0.5,0,0.8-0.1v5.6c-0.4,0-0.6,0.1-0.8,0.2c-0.2,0-0.6,0-1.2,0c-6,0-10.8-4.1-10.8-10.2V12h6v8.7H47.5z M54,27.6c0.6,0.2,1.3,0.4,2,0.4c0.7,0.1,1.4,0.2,2,0.2c0.8,0,2.8-0.2,2.8-1.3c0-1.2-1.8-1.3-2.6-1.3c-1.8,0-3.3,0.4-4.2,2z M65.3,33.8v5.6c-2.2,0.5-4.5,0.9-6.8,0.9c-6.4,0-11.1-3.7-11.1-10.2c0-6.4,4.6-10.3,10.6-10.3c4.1,0,8.9,2,8.9,6.6c0,4.6-5,6.4-8.9,6.4c-1.5,0-3-0.4-4.3-1c0.8,2.2,3.2,2.6,5.3,2.6c1.1,0,2.2,0,3.2-0.2c1-0.1,2.2-0.2,3.1-0.5z M73.4,30v10h-6V30c0-6.6,4.9-10.2,11-10.2c0.2,0,0.5,0,0.8,0c0.3,0,0.6,0.1,0.9,0.2v5.8c-0.2,0-0.4-0.1-0.7-0.1c-0.2,0-0.5,0-0.7,0c-1,0-1.8,0.1-2.5,0.3c-1.1,0.4-2.1,1.2-2.5,2.4c-0.2,0.5-0.3,1.1-0.3,1.7z M80.6,15.5h18.2v5.6h-12.2v3.9h9.8v5.6h-9.8v9.4h-6V15.5z M108,34.6c2.9,0,4.6-1.7,4.6-4.6s-1.7-4.6-4.6-4.6s-4.6,1.7-4.6,4.6S105.1,34.6,108,34.6z M108,40.2c-6.2,0-10.6-4.1-10.6-10.2c0-6.3,4.4-10.2,10.6-10.2c6.2,0,10.6,4.1,10.6,10.2C118.6,36.1,114.2,40.2,108,40.2z M128.5,34.6c2.9,0,4.6-1.7,4.6-4.6s-1.7-4.6-4.6-4.6s-4.6,1.7-4.6,4.6S125.6,34.6,128.5,34.6z M128.5,40.2c-6.2,0-10.6-4.1-10.6-10.2c0-6.3,4.4-10.2,10.6-10.2c6.2,0,10.6,4.1,10.6,10.2C139.1,36.1,134.7,40.2,128.5,40.2z M153.6,30c0-3-1.5-4.6-4.5-4.6c-0.8,0-1.6,0.1-2.2,0.4c-1.1,0.5-1.9,1.3-2.2,2.5c-0.2,0.6-0.3,1.2-0.3,1.8s0.1,1.2,0.3,1.8c0.3,1.2,1.2,2,2.2,2.4c0.6,0.3,1.3,0.4,2.2,0.4C152.1,34.6,153.6,33,153.6,30z M153.6,22V12h6v18c0,6.4-4.5,10.2-10.6,10.2c-6.2,0-10.6-4-10.6-10.1c0-5.6,4.2-10.3,9.8-10.3c2.1,0,4,0.6,5.4,2.2z"></path>
            </g>
          </svg>
        </div>
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