import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, Mail, ExternalLink } from 'lucide-react';
import { PublicRestaurantData } from '@/types/restaurant';

interface AdditionalInfoProps {
  restaurant: PublicRestaurantData;
}

const AdditionalInfo: React.FC<AdditionalInfoProps> = ({ restaurant }) => {
  const {
    phone,
    email,
    whatsapp_url: whatsappUrl,
    ifood_url: ifoodUrl,
    other_url: otherUrl,
    other_url_label: otherUrlLabel,
  } = restaurant;

  const hasContactInfo = phone || email;
  const hasUsefulLinks = whatsappUrl || ifoodUrl || (otherUrl && otherUrlLabel);

  if (!hasContactInfo && !hasUsefulLinks) {
    return null; // Se não houver informações de contato ou links úteis, não renderiza o card
  }

  return (
    <Card id="additional-info-section" className="shadow-soft-md border border-gray-300 rounded-xl p-0">
      <CardHeader className="flex flex-row items-center space-x-3 p-4 border-b border-gray-100">
        <CardTitle className="text-2xl font-extrabold text-primary">Informações Adicionais</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-6">
        {/* Contato */}
        {hasContactInfo && (
          <div className="space-y-4">
            {phone && (
              <div className="flex items-start">
                <Phone className="w-5 h-5 text-gray-500 flex-shrink-0" />
                <div className="ml-3 min-w-0">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Telefone</p>
                  <a href={`tel:${phone}`} className="text-base font-bold text-primary hover:text-primary/90 transition-colors break-words">
                    {phone}
                  </a>
                </div>
              </div>
            )}
            {email && (
              <div className="flex items-start">
                <Mail className="w-5 h-5 text-gray-500 flex-shrink-0" />
                <div className="ml-3 min-w-0">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Email</p>
                  <a href={`mailto:${email}`} className="text-base font-bold text-primary hover:text-primary/90 transition-colors break-words">
                    {email}
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Separator between Contact Info and Useful Links */}
        {hasContactInfo && hasUsefulLinks && <Separator className="my-4 bg-gray-100" />}

        {/* Links Úteis */}
        {hasUsefulLinks && (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">Links Úteis</p>
            <div className="flex flex-wrap gap-4">
              {whatsappUrl && (
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="text-base font-bold text-primary hover:text-primary/90 transition-colors flex items-center">
                  WhatsApp <ExternalLink className="w-4 h-4 ml-1" />
                </a>
              )}
              {ifoodUrl && (
                <a href={ifoodUrl} target="_blank" rel="noopener noreferrer" className="text-base font-bold text-primary hover:text-primary/90 transition-colors flex items-center">
                  iFood <ExternalLink className="w-4 h-4 ml-1" />
                </a>
              )}
              {otherUrl && otherUrlLabel && (
                <a href={otherUrl} target="_blank" rel="noopener noreferrer" className="text-base font-bold text-primary hover:text-primary/90 transition-colors flex items-center">
                  {otherUrlLabel} <ExternalLink className="w-4 h-4 ml-1" />
                </a>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdditionalInfo;