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
                <img
                  alt="Google logo"
                  className="w-5 h-5 mr-2"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCHCwDd1qyknEolrO2aZiuyydN8N4wurGMGDy8v6xoXGLQ22jYf9FQQUMZk-5853NzvK3Kw_3ETaqGsE3AN2ebGniXdw-9nXGctNa9H-qjeLzlMqi7Nq7vY590IvUWRZTkmKfkncfU43c-Srn-ZMWFZhyNw9OCkHGuHTId5iziQyDmTuBSUEXOQaTn6eko8u6E_Jv617JSWhjGnu1cElM-AtVNDmhK87f2h6SexYYavDOOtmCwbtx1hcguIBVIuyDOO-uYggeLEADrV"
                />
                Continuar com Google
              </Button>
              <Button
                variant="outline"
                className="w-full h-auto py-3.5 text-base font-semibold"
              >
                <img
                  alt="Apple logo"
                  className="w-5 h-5 mr-2"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAa9zdce7JX7qyLE7MHZRDCLDEypMrIjmncBj3OiT_MdRjRrxVaNINNOOOcQnSDTCqggqCs6eCt52KyasKj78zJmXWjH5oLdXhuWtgPh4uvovHvjmHIaQu_LHNxvbkiE-hxUsRupgVQ5swPjWl27wJ4vADpyS2L7Pq_IKi8ld7dcR_Es1mW2d5-U8IQD5hAhQJPdwVY2_QAzh9QvDDWa-TN7Xa4Y8Umm0KGS7Fvmr2RAdvFtvB9Zp8QgiL5O5a15v_c6CjzH7ldm9_H"
                />
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