const fs = require('fs');
const path = require('path');

const exportedPath = path.join(__dirname, '..', 'src', 'pages', 'admin', 'ExportedRestaurants.tsx');
const collectorPath = path.join(__dirname, '..', 'src', 'pages', 'admin', 'GoogleMapsCollector.tsx');

console.log('Starting refactoring...');

// --- REFACTOR EXPORTED RESTAURANTS ---
let exportedContent = fs.readFileSync(exportedPath, 'utf8');

// 1. Replace imports
const oldDialogImport = `import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";`;

const newImports = `import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RestaurantDetailsDialog } from '@/components/admin/RestaurantDetailsDialog';`;

exportedContent = exportedContent.replace(oldDialogImport, '/* Dialog import replaced */');
// Replace the block of ui imports around line 39
exportedContent = exportedContent.replace(
  `import { Label } from '@/components/ui/label';\nimport { Textarea } from '@/components/ui/textarea';\nimport { Checkbox } from '@/components/ui/checkbox';\nimport { ScrollArea } from '@/components/ui/scroll-area';\nimport { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';`,
  newImports
);

// 2. Replace state variables
const oldStates = `  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<any | null>(null);
  const [aiPastedContent, setAiPastedContent] = useState('');
  const [isExtractingAI, setIsExtractingAI] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncingStatus, setSyncingStatus] = useState<string | null>(null);
  const [activeDialogTab, setActiveDialogTab] = useState<string>('preview');
  const [newGalleryUrl, setNewGalleryUrl] = useState('');
  const [aiModel, setAiModel] = useState<'gemini' | 'openai'>('gemini');`;

const newStates = `  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncingStatus, setSyncingStatus] = useState<string | null>(null);`;

exportedContent = exportedContent.replace(oldStates, newStates);

// 3. Replace mapSupabaseToLocal
const oldMap = `  const mapSupabaseToLocal = (dbItem: any) => {
    const socialNetworks = dbItem.social_networks || [];
    const instagram = socialNetworks.find((sn: any) => sn && sn.platform === 'instagram')?.url || '';
    const facebook = socialNetworks.find((sn: any) => sn && sn.platform === 'facebook')?.url || '';

    const menuCategories = (dbItem.menu_categories || []).map((cat: any) => ({
      id: cat.id,
      name: cat.name,
      items: (cat.menu_items || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description || '',
        price: item.price,
        image_url: item.image_url || ''
      }))
    }));

    let googleMapsUrl = '';
    const visitNotes = dbItem.visit_notes || '';
    const gmapsMatch = visitNotes.match(/Google Maps:\\s*(https?:\\/\\/[^\\s\\n\\r]+)/);
    if (gmapsMatch) {
      googleMapsUrl = gmapsMatch[1];
    }

    return {
      id: dbItem.id,
      name: dbItem.name,
      category: dbItem.category || '',
      phone: dbItem.phone || '',
      cep: dbItem.cep || '',
      address: dbItem.address || '',
      number: dbItem.number || '',
      neighborhood: dbItem.neighborhood || '',
      city: dbItem.city || '',
      state: dbItem.state || '',
      description: dbItem.description || '',
      logo: dbItem.image_url || '',
      coverImage: dbItem.cover_image_url || '',
      cover_image_url: dbItem.cover_image_url || '',
      visit_status: dbItem.visit_status || 'Pendente',
      visit_notes: dbItem.visit_notes || '',
      claim_code: dbItem.claim_code || '',
      openingHours: dbItem.opening_hours || null,
      opening_hours: dbItem.opening_hours || null,
      social_networks: socialNetworks,
      instagram: instagram,
      facebook: facebook,
      website: instagram || dbItem.other_url || dbItem.external_url || '',
      menuSourceUrl: dbItem.other_url || dbItem.external_url || '',
      menuUrl: dbItem.other_url || dbItem.external_url || '',
      latitude: dbItem.latitude,
      longitude: dbItem.longitude,
      menu_categories: menuCategories,
      rating: typeof dbItem.rating === 'number' ? dbItem.rating : 4.0,
      reviewsCount: typeof dbItem.reviews_count === 'number' ? dbItem.reviews_count : 10,
      googleMapsUrl
    };
  };`;

const newMap = `  const mapSupabaseToLocal = (dbItem: any) => {
    const socialNetworks = dbItem.social_networks || [];
    const instagram = socialNetworks.find((sn: any) => sn && sn.platform === 'instagram')?.url || '';
    const facebook = socialNetworks.find((sn: any) => sn && sn.platform === 'facebook')?.url || '';

    const menuCategories = (dbItem.menu_categories || []).map((cat: any) => ({
      id: cat.id,
      name: cat.name,
      items: (cat.menu_items || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description || '',
        price: item.price,
        image_url: item.image_url || ''
      }))
    }));

    const galleryImages = (dbItem.restaurant_gallery || []).map((img: any) => img.image_url);

    let googleMapsUrl = '';
    const visitNotes = dbItem.visit_notes || '';
    const gmapsMatch = visitNotes.match(/Google Maps:\\s*(https?:\\/\\/[^\\s\\n\\r]+)/);
    if (gmapsMatch) {
      googleMapsUrl = gmapsMatch[1];
    }

    return {
      id: dbItem.id,
      name: dbItem.name,
      category: dbItem.category || '',
      phone: dbItem.phone || '',
      cep: dbItem.cep || '',
      address: dbItem.address || '',
      number: dbItem.number || '',
      neighborhood: dbItem.neighborhood || '',
      city: dbItem.city || '',
      state: dbItem.state || '',
      description: dbItem.description || '',
      logo: dbItem.image_url || '',
      coverImage: dbItem.cover_image_url || '',
      cover_image_url: dbItem.cover_image_url || '',
      visit_status: dbItem.visit_status || 'Pendente',
      visit_notes: visitNotes,
      claim_code: dbItem.claim_code || '',
      openingHours: dbItem.opening_hours || null,
      opening_hours: dbItem.opening_hours || null,
      social_networks: socialNetworks,
      instagram: instagram,
      facebook: facebook,
      website: instagram || dbItem.other_url || dbItem.external_url || '',
      menuSourceUrl: dbItem.other_url || dbItem.external_url || '',
      menuUrl: dbItem.other_url || dbItem.external_url || '',
      latitude: dbItem.latitude,
      longitude: dbItem.longitude,
      menu_categories: menuCategories,
      rating: typeof dbItem.rating === 'number' ? dbItem.rating : 4.0,
      reviewsCount: typeof dbItem.reviews_count === 'number' ? dbItem.reviews_count : 10,
      googleMapsUrl,
      galleryImages
    };
  };`;

exportedContent = exportedContent.replace(oldMap, newMap);

// 4. Replace loadRestaurants select query
const oldLoadSelect = `      const { data, error } = await supabase
        .from('restaurants')
        .select(\`
          *,
          menu_categories (
            *,
            menu_items (*)
          )
        \`)`;

const newLoadSelect = `      const { data, error } = await supabase
        .from('restaurants')
        .select(\`
          *,
          menu_categories (
            *,
            menu_items (*)
          ),
          restaurant_gallery (*)
        \`)`;

exportedContent = exportedContent.replace(oldLoadSelect, newLoadSelect);

// 5. Replace openDetails
const oldOpenDetails = `  const openDetails = (restaurant: any) => {
    let parsedAddress = {
      street: restaurant.address || '',
      number: restaurant.number || '',
      neighborhood: restaurant.neighborhood || '',
      city: restaurant.city || '',
      state: restaurant.state || '',
      cep: restaurant.cep || ''
    };
    
    // Auto-parse if cep/number/neighborhood are empty but address contains full address string
    if (!restaurant.cep && restaurant.address && (restaurant.address.includes(',') || restaurant.address.includes('-'))) {
      const parsed = parseAddressString(restaurant.address);
      parsedAddress = {
        street: parsed.street || restaurant.address || '',
        number: parsed.number || restaurant.number || 'S/N',
        neighborhood: parsed.neighborhood || restaurant.neighborhood || '',
        city: parsed.city || restaurant.city || '',
        state: parsed.state || restaurant.state || '',
        cep: parsed.cep || restaurant.cep || ''
      };
    }
    
    const formattedRestaurant = {
      ...restaurant,
      address: parsedAddress.street,
      number: parsedAddress.number,
      neighborhood: parsedAddress.neighborhood,
      city: parsedAddress.city,
      state: parsedAddress.state,
      cep: parsedAddress.cep
    };

    setSelectedRestaurant(formattedRestaurant);
    setEditedData(JSON.parse(JSON.stringify(formattedRestaurant)));
    setIsEditing(false);
    setActiveDialogTab('preview');
  };`;

const newOpenDetails = `  const openDetails = (restaurant: any) => {
    setSelectedRestaurant(restaurant);
  };`;

exportedContent = exportedContent.replace(oldOpenDetails, newOpenDetails);

// 6. Delete all the Dialog helpers inside ExportedRestaurants
// We will search for 'const handleAIExtraction = async () => {' and delete up to the line before 'const filteredRestaurants = '
const startIdx = exportedContent.indexOf('  const handleAIExtraction = async () => {');
const endIdx = exportedContent.indexOf('  const filteredRestaurants = ');

if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
  exportedContent = exportedContent.substring(0, startIdx) + 
                    `  // Handlers locais de IA, edicao e galeria removidos (movidos para RestaurantDetailsDialog)\n\n` + 
                    exportedContent.substring(endIdx);
  console.log('Removed local dialog handlers.');
} else {
  console.error('COULD NOT find dialog handlers block in ExportedRestaurants.tsx!');
}

// 7. Replace the Dialog element at the bottom
// We find '<Dialog open={selectedRestaurant !== null}' down to '</Dialog>'
const dialogStart = exportedContent.indexOf('      <Dialog open={selectedRestaurant !== null}');
// Let's find '</Dialog>' after the dialogStart
const dialogEnd = exportedContent.indexOf('      </Dialog>', dialogStart);

if (dialogStart !== -1 && dialogEnd !== -1 && dialogEnd > dialogStart) {
  const oldDialogBlock = exportedContent.substring(dialogStart, dialogEnd + '      </Dialog>'.length);
  const newDialogBlock = `      {/* Modal de Detalhes / Edicao / IA Compartilhado */}
      <RestaurantDetailsDialog
        restaurant={selectedRestaurant}
        isOpen={selectedRestaurant !== null}
        onClose={() => setSelectedRestaurant(null)}
        onSyncSuccess={loadRestaurants}
      />`;
  exportedContent = exportedContent.replace(oldDialogBlock, newDialogBlock);
  console.log('Replaced Dialog block at the bottom.');
} else {
  console.error('COULD NOT find Dialog block at the bottom in ExportedRestaurants.tsx!');
}

fs.writeFileSync(exportedPath, exportedContent, 'utf8');
console.log('Refactored ExportedRestaurants.tsx successfully.');


// --- REFACTOR GOOGLE MAPS COLLECTOR ---
let collectorContent = fs.readFileSync(collectorPath, 'utf8');

// 1. Add import
const collectorDialogImport = `import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';`;
const collectorNewDialogImport = `import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';\nimport { RestaurantDetailsDialog } from '@/components/admin/RestaurantDetailsDialog';`;
collectorContent = collectorContent.replace(collectorDialogImport, collectorNewDialogImport);

// 2. Replace loadScrapedFromSupabase query and mapping
const oldLoadScraped = `  const loadScrapedFromSupabase = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('visit_status', 'Pendente')
        .or('is_deleted.eq.false,is_deleted.is.null')
        .order('name');
      
      if (error) throw error;
      
      if (data) {
        const normalizedCity = city.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").trim();
        const filtered = data.filter((item: any) => {
          const itemCity = (item.city || '').toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").trim();
          return itemCity.includes(normalizedCity) || normalizedCity.includes(itemCity);
        });

        const formatted = filtered.map((item: any) => {
          const socialNetworks = item.social_networks || [];
          const instagram = socialNetworks.find((sn: any) => sn && sn.platform === 'instagram')?.url || '';
          const facebook = socialNetworks.find((sn: any) => sn && sn.platform === 'facebook')?.url || '';
          
          let googleMapsUrl = '';
          const visitNotes = item.visit_notes || '';
          const gmapsMatch = visitNotes.match(/Google Maps:\\s*(https?:\\/\\/[^\\s\\n\\r]+)/);
          if (gmapsMatch) {
            googleMapsUrl = gmapsMatch[1];
          }

          return {
            id: item.id,
            name: item.name,
            category: item.category || 'Restaurante',
            rating: typeof item.rating === 'number' ? item.rating : 4.0,
            reviewsCount: typeof item.reviews_count === 'number' ? item.reviews_count : 10,
            address: item.address || '',
            phone: item.phone || '',
            city: item.city || 'João Pessoa',
            state: item.state || 'PB',
            instagram,
            facebook,
            coverImage: item.cover_image_url || '',
            galleryImages: [],
            openingHours: item.opening_hours || {},
            website: item.other_url || item.external_url || '',
            googleMapsUrl,
            menuSourceUrl: item.other_url || item.external_url || '',
            assignedToId: item.assigned_to_id || '',
            assignedToName: item.assigned_to_name || ''
          };
        });
        setResults(formatted);
      } else {
        setResults([]);
      }
    } catch (e) {
      console.error(e);
      showError('Erro ao carregar do Supabase.');
    }
  };`;

const newLoadScraped = `  const loadScrapedFromSupabase = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select(\`
          *,
          menu_categories (
            *,
            menu_items (*)
          ),
          restaurant_gallery (*)
        \`)
        .eq('visit_status', 'Pendente')
        .or('is_deleted.eq.false,is_deleted.is.null')
        .order('name');
      
      if (error) throw error;
      
      if (data) {
        const normalizedCity = city.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").trim();
        const filtered = data.filter((item: any) => {
          const itemCity = (item.city || '').toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").trim();
          return itemCity.includes(normalizedCity) || normalizedCity.includes(itemCity);
        });

        const formatted = filtered.map((item: any) => {
          const socialNetworks = item.social_networks || [];
          const instagram = socialNetworks.find((sn: any) => sn && sn.platform === 'instagram')?.url || '';
          const facebook = socialNetworks.find((sn: any) => sn && sn.platform === 'facebook')?.url || '';
          
          let googleMapsUrl = '';
          const visitNotes = item.visit_notes || '';
          const gmapsMatch = visitNotes.match(/Google Maps:\\s*(https?:\\/\\/[^\\s\\n\\r]+)/);
          if (gmapsMatch) {
            googleMapsUrl = gmapsMatch[1];
          }

          const menuCategories = (item.menu_categories || []).map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            items: (cat.menu_items || []).map((menuItem: any) => ({
              id: menuItem.id,
              name: menuItem.name,
              description: menuItem.description || '',
              price: menuItem.price,
              image_url: menuItem.image_url || ''
            }))
          }));

          const galleryImages = (item.restaurant_gallery || []).map((img: any) => img.image_url);

          return {
            id: item.id,
            name: item.name,
            category: item.category || 'Restaurante',
            rating: typeof item.rating === 'number' ? item.rating : 4.0,
            reviewsCount: typeof item.reviews_count === 'number' ? item.reviews_count : 10,
            address: item.address || '',
            phone: item.phone || '',
            city: item.city || 'João Pessoa',
            state: item.state || 'PB',
            instagram,
            facebook,
            coverImage: item.cover_image_url || '',
            galleryImages,
            openingHours: item.opening_hours || {},
            website: item.other_url || item.external_url || '',
            googleMapsUrl,
            menuSourceUrl: item.other_url || item.external_url || '',
            assignedToId: item.assigned_to_id || '',
            assignedToName: item.assigned_to_name || '',
            menu_categories: menuCategories
          };
        });
        setResults(formatted);
      } else {
        setResults([]);
      }
    } catch (e) {
      console.error(e);
      showError('Erro ao carregar do Supabase.');
    }
  };`;

collectorContent = collectorContent.replace(oldLoadScraped, newLoadScraped);

// 3. Remove handleSaveEditedRestaurant since saving is handled inside the dialog
const oldSaveEdited = `  const handleSaveEditedRestaurant = async (updated: ScrapedRestaurant) => {
    try {
      const updatedResults = results.map(r => r.id === updated.id ? updated : r);
      setResults(updatedResults);
      
      const uuidId = updated.id;
      
      let visitNotes = updated.visit_notes || '';
      if (updated.googleMapsUrl) {
        if (visitNotes.includes('Google Maps:')) {
          visitNotes = visitNotes.replace(/Google Maps:\\s*(https?:\\/\\/[^\\s]+)/, \`Google Maps: \${updated.googleMapsUrl}\`);
        } else {
          visitNotes = \`\${visitNotes}\\nGoogle Maps: \${updated.googleMapsUrl}\`.trim();
        }
      }

      const { error } = await supabase
        .from('restaurants')
        .update({
          name: updated.name,
          phone: cleanPhone(updated.phone || ''),
          category: updated.category || 'Restaurante',
          address: cleanAddress(updated.address || ''),
          other_url: updated.menuSourceUrl || null,
          external_url: updated.menuSourceUrl || null,
          visit_notes: visitNotes,
          social_networks: [
            { platform: 'instagram', url: updated.instagram || '' },
            { platform: 'facebook', url: updated.facebook || '' }
          ].filter(s => s.url)
        })
        .eq('id', uuidId);

      if (error) throw error;

      showSuccess('Restaurante atualizado com sucesso no Supabase!');
      setEditingRestaurant(null);
      
      // Notifica as abas
      window.dispatchEvent(new Event('local-sync-restaurants'));
      loadScrapedFromSupabase();
    } catch (err) {
      console.error(err);
      showError('Erro ao atualizar restaurante.');
    }
  };`;

const newSaveEdited = `  const handleSaveEditedRestaurant = async (updated: ScrapedRestaurant) => {
    // Handled inside RestaurantDetailsDialog
  };`;

collectorContent = collectorContent.replace(oldSaveEdited, newSaveEdited);

// 4. Replace the old simple Dialog block at the bottom
const collectorDialogStart = collectorContent.indexOf('      {/* Modal de Edição de Restaurante */}');
const collectorDialogEnd = collectorContent.indexOf('        </Dialog>', collectorDialogStart);

if (collectorDialogStart !== -1 && collectorDialogEnd !== -1 && collectorDialogEnd > collectorDialogStart) {
  const oldDialogBlock = collectorContent.substring(collectorDialogStart, collectorDialogEnd + '        </Dialog>\n      }'.length);
  const newDialogBlock = `      {/* Modal de Detalhes / Edicao / IA Compartilhado */}
      <RestaurantDetailsDialog
        restaurant={editingRestaurant}
        isOpen={editingRestaurant !== null}
        onClose={() => setEditingRestaurant(null)}
        onSyncSuccess={loadScrapedFromSupabase}
      />`;
  collectorContent = collectorContent.replace(oldDialogBlock, newDialogBlock);
  console.log('Replaced collector old Dialog block at the bottom.');
} else {
  console.error('COULD NOT find old Dialog block at the bottom in GoogleMapsCollector.tsx!');
}

fs.writeFileSync(collectorPath, collectorContent, 'utf8');
console.log('Refactored GoogleMapsCollector.tsx successfully.');

console.log('Refactoring complete!');
