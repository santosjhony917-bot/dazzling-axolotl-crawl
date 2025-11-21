import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const Filters = () => {
    const navigate = useNavigate();
    const { toast } = useToast();

    const [priceRange, setPriceRange] = useState([0, 100]);
    const [distance, setDistance] = useState([2]);
    const [selectedFoodTypes, setSelectedFoodTypes] = useState<string[]>([]);
    const [serviceTypes, setServiceTypes] = useState({
        delivery: false,
        presencial: false,
    });
    const [paymentMethods, setPaymentMethods] = useState({
        pix: false,
        dinheiro: false,
        credito: false,
        debito: false,
        aleloRefeicao: false,
        sodexo: false,
    });

    const foodTypes = [
        { id: "pizza", label: "Pizza" },
        { id: "japonesa", label: "Japonesa" },
        { id: "brasileira", label: "Brasileira" },
        { id: "fit", label: "Fit" },
        { id: "sobremesas", label: "Sobremesas" },
        { id: "churrasco", label: "Churrasco" },
        { id: "lanches", label: "Lanches" },
        { id: "italiano", label: "Italiano" },
    ];

    const toggleFoodType = (id: string) => {
        setSelectedFoodTypes((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const handleClearFilters = () => {
        setPriceRange([0, 100]);
        setDistance([2]);
        setSelectedFoodTypes([]);
        setServiceTypes({ delivery: false, presencial: false });
        setPaymentMethods({
            pix: false,
            dinheiro: false,
            credito: false,
            debito: false,
            aleloRefeicao: false,
            sodexo: false,
        });
        toast({
            title: "Filtros limpos",
            description: "Todos os filtros foram resetados",
        });
    };

    const handleSearch = () => {
        toast({
            title: "Buscando pratos",
            description: `Filtros aplicados: R$ ${priceRange[0]}–${priceRange[1]}, até ${distance[0]} km`,
        });
        navigate("/home");
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-card border-b border-border">
                <div className="flex items-center justify-between px-4 py-4">
                    <button
                        onClick={() => navigate("/home")}
                        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5 text-foreground" />
                    </button>
                    <div className="text-center flex-1">
                        <h1 className="text-lg font-bold text-foreground">Filtros de Busca</h1>
                        <p className="text-xs text-muted-foreground">Configure suas preferências</p>
                    </div>
                    <div className="w-10" /> {/* Spacer for alignment */}
                </div>
            </div>

            {/* Content */}
            <div className="px-4 py-6 space-y-6 pb-32">
                {/* Preço */}
                <Card className="p-4">
                    <h3 className="text-sm font-semibold text-foreground mb-4">Preço</h3>
                    <div className="flex items-center justify-between mb-3">
                        <div className="text-center">
                            <p className="text-xs text-muted-foreground mb-1">Mín.</p>
                            <p className="text-sm font-bold text-foreground">R$ {priceRange[0]}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-muted-foreground mb-1">Máx.</p>
                            <p className="text-sm font-bold text-foreground">R$ {priceRange[1]}</p>
                        </div>
                    </div>
                    <Slider
                        value={priceRange}
                        onValueChange={setPriceRange}
                        min={0}
                        max={500}
                        step={10}
                        className="mb-2"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>R$ 0</span>
                        <span>R$ 500</span>
                    </div>
                </Card>

                {/* Distância */}
                <Card className="p-4">
                    <h3 className="text-sm font-semibold text-foreground mb-4">Distância</h3>
                    <div className="bg-muted/30 rounded-lg p-3 mb-3 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Até</p>
                        <p className="text-2xl font-bold text-foreground">
                            {distance[0] >= 50 ? "50+" : distance[0]} km
                        </p>
                    </div>
                    <Slider
                        value={distance}
                        onValueChange={setDistance}
                        min={1}
                        max={50}
                        step={1}
                        className="mb-2"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>1 km</span>
                        <span>50+ km</span>
                    </div>
                </Card>

                {/* Tipo de Serviço */}
                <Card className="p-4">
                    <h3 className="text-sm font-semibold text-foreground mb-3">Tipo de Serviço</h3>
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="delivery"
                                checked={serviceTypes.delivery}
                                onCheckedChange={(checked) =>
                                    setServiceTypes((prev) => ({ ...prev, delivery: !!checked }))
                                }
                            />
                            <label
                                htmlFor="delivery"
                                className="text-sm text-foreground cursor-pointer flex items-center gap-2"
                            >
                                <span>🚚</span>
                                Delivery
                            </label>
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="presencial"
                                checked={serviceTypes.presencial}
                                onCheckedChange={(checked) =>
                                    setServiceTypes((prev) => ({ ...prev, presencial: !!checked }))
                                }
                            />
                            <label
                                htmlFor="presencial"
                                className="text-sm text-foreground cursor-pointer flex items-center gap-2"
                            >
                                <span>🏠</span>
                                Presencial
                            </label>
                        </div>
                    </div>
                </Card>

                {/* Formas de Pagamento */}
                <Card className="p-4">
                    <h3 className="text-sm font-semibold text-foreground mb-3">Formas de Pagamento</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="pix"
                                checked={paymentMethods.pix}
                                onCheckedChange={(checked) =>
                                    setPaymentMethods((prev) => ({ ...prev, pix: !!checked }))
                                }
                            />
                            <label htmlFor="pix" className="text-sm text-foreground cursor-pointer">
                                PIX
                            </label>
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="dinheiro"
                                checked={paymentMethods.dinheiro}
                                onCheckedChange={(checked) =>
                                    setPaymentMethods((prev) => ({ ...prev, dinheiro: !!checked }))
                                }
                            />
                            <label htmlFor="dinheiro" className="text-sm text-foreground cursor-pointer">
                                Dinheiro
                            </label>
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="credito"
                                checked={paymentMethods.credito}
                                onCheckedChange={(checked) =>
                                    setPaymentMethods((prev) => ({ ...prev, credito: !!checked }))
                                }
                            />
                            <label htmlFor="credito" className="text-sm text-foreground cursor-pointer">
                                Crédito
                            </label>
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="debito"
                                checked={paymentMethods.debito}
                                onCheckedChange={(checked) =>
                                    setPaymentMethods((prev) => ({ ...prev, debito: !!checked }))
                                }
                            />
                            <label htmlFor="debito" className="text-sm text-foreground cursor-pointer">
                                Débito
                            </label>
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="aleloRefeicao"
                                checked={paymentMethods.aleloRefeicao}
                                onCheckedChange={(checked) =>
                                    setPaymentMethods((prev) => ({ ...prev, aleloRefeicao: !!checked }))
                                }
                            />
                            <label htmlFor="aleloRefeicao" className="text-sm text-foreground cursor-pointer">
                                Alelo Refeição
                            </label>
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="sodexo"
                                checked={paymentMethods.sodexo}
                                onCheckedChange={(checked) =>
                                    setPaymentMethods((prev) => ({ ...prev, sodexo: !!checked }))
                                }
                            />
                            <label htmlFor="sodexo" className="text-sm text-foreground cursor-pointer">
                                Sodexo
                            </label>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Fixed Bottom Actions */}
            <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 space-y-3">
                <Button
                    onClick={handleSearch}
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl"
                >
                    Buscar Pratos
                </Button>
                <Button
                    onClick={handleClearFilters}
                    variant="outline"
                    className="w-full h-12 border-[#E47948] text-[#E47948] hover:bg-[#E47948]/10 rounded-xl"
                >
                    Limpar Filtros
                </Button>
                <Button
                    onClick={() => navigate(-1)}
                    variant="ghost"
                    className="w-full h-12 bg-muted/30 text-foreground hover:bg-muted/50 rounded-xl"
                >
                    Voltar
                </Button>
            </div>
        </div>
    );
};

export default Filters;
