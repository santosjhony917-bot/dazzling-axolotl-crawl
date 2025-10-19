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

const primaryColor = "#022D68";

const LocationIcon = ({ color }: { color: string }) => (
  <svg viewBox="125 -5 100 110" className="w-full h-auto">
    <g transform="matrix(-1.022,0,0,1.022,227.94,-1.794)" fill={color}>
      <path d="M51.798,25.546c-5.767,0-10.458,4.692-10.458,10.459c0,4.981,3.971,14.129,10.458,14.129  c6.488,0,10.458-9.147,10.458-14.129C62.256,30.239,57.564,25.546,51.798,25.546z M51.798,44.633c-1.992,0-4.956-5.162-4.956-8.627  c0-2.732,2.224-4.957,4.956-4.957s4.957,2.225,4.957,4.957C56.755,39.471,53.79,44.633,51.798,44.633z"></path>
      <path d="M82.882,50.348c2.082-4.465,3.162-9.322,3.162-14.342c0-18.886-15.363-34.251-34.246-34.251  c-18.882,0-34.245,15.365-34.245,34.251c0,4.167,0.753,8.22,2.198,12.034c0.645,1.572,3.26,7.376,8.777,13.01  c0.22,0.206,0.422,0.43,0.646,0.628l19.662,20.885c0.03,0.033,3.075,3.029,5.928-0.001l3.655-3.883h10.836  c0.903,0.112,2.088,0.546,2.644,2.031c0.003,0.009,0.007,0.012,0.009,0.019l2.966,7.907H74.87c0,0,0.003,0.009,0.003,0.01  l0.219,0.568c0.317,1.13,0.398,3.528-4.688,3.528H31.886c-4.293,0-3.763-2.433-3.555-3.059l3.068-8.18  c0.057-0.113,0.114-0.233,0.173-0.392c0.676-1.76,1.363-2.29,1.834-2.434h2.09c3.04,0,0.711-2.465,0.711-2.465h0.002l-1.082-1.147  c0-0.003-0.002-0.003-0.003-0.004c-1.411-1.496-3.1-1.825-4.066-1.886h-0.963c-0.645,0.116-1.703,0.681-2.563,2.966l-6.275,16.733  c-0.009,0.03-1.386,5.368,7.131,5.368h46.542c0,0,8.987-1.14,6.504-7.775L76.254,76.66c0-0.005-0.004-0.01-0.004-0.015  c-1.331-3.548-5.043-3.469-5.043-3.469h-7.61L74.515,61.58l3.555-3.793C80.358,54.923,81.921,52.239,82.882,50.348z M54.487,74.825  c-0.003,0.003-0.004,0.003-0.007,0.009c-2.351,2.497-4.419,0.939-5.114,0.267l-0.242-0.257c-0.002-0.004-0.009-0.01-0.009-0.01  L33.089,57.81l-0.191-0.186c-1.336-1.168-2.575-2.473-3.68-3.882l-0.271-0.354c-3.854-5.062-5.89-11.07-5.89-17.38  c0-15.852,12.895-28.749,28.742-28.749c15.85,0,28.742,12.896,28.742,28.749c0,6.31-2.035,12.32-5.891,17.38L54.487,74.825z"></path>
    </g>
  </svg>
);

export default function CustomerLogin() {
  const [passwordVisible, setPasswordVisible] = useState(false);

  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-x-hidden bg-[#f5f7f8] p-4">
      <header className="flex flex-col items-center justify-center pt-16 pb-6 w-full max-w-sm">
        <div className="w-24 h-auto drop-shadow-md">
          <LocationIcon color={primaryColor} />
        </div>
      </header>

      <main className="flex-1 flex flex-col justify-center w-full max-w-sm">
        <Card className="w-full shadow-xl border-none rounded-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-[#022D68] tracking-tight text-4xl font-extrabold leading-tight">
              Entrar
            </CardTitle>
            <CardDescription className="text-gray-600 text-lg font-medium leading-normal pt-2">
              Bem-vindo de volta! Faça seu login.
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
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-[#022D68] transition-colors"
                  type="button"
                >
                  {passwordVisible ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex justify-end mt-2">
              <Link
                to="/forgot-password"
                className="text-sm font-semibold text-[#022D68] hover:underline transition-colors"
              >
                Esqueci minha senha?
              </Link>
            </div>

            <div className="mt-4 space-y-4">
              <Button className="w-full bg-[#E47948] text-white font-bold py-3.5 h-auto text-lg rounded-full shadow-lg hover:bg-[#E47948]/90 transition-opacity shadow-[#E47948]/50">
                Entrar
              </Button>

              <div className="relative flex items-center justify-center pt-2">
                <div className="absolute w-full border-t border-gray-300"></div>
                <span className="bg-white px-3 text-sm text-gray-500 z-10">
                  ou
                </span>
              </div>

              <Button
                variant="outline"
                className="w-full h-auto py-3.5 text-base font-semibold rounded-full"
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
                className="w-full h-auto py-3.5 text-base font-semibold rounded-full"
              >
                <i className="fa-brands fa-apple w-5 h-5 mr-2"></i>
                Continuar com Apple
              </Button>
            </div>

            <p className="pt-6 text-center text-base text-gray-600">
              Não tem uma conta?
              <Link
                to="/customer-signup"
                className="font-bold text-[#022D68] hover:underline ml-1 transition-colors"
              >
                Criar conta
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}