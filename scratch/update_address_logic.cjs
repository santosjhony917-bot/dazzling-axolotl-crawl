const fs = require('fs');
const path = require('path');

const filePath = 'src/pages/admin/ExportedRestaurants.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Define parseAddressString function
const parseAddressStringFn = `
const parseAddressString = (addressStr: string) => {
  let street = '';
  let number = 'S/N';
  let neighborhood = '';
  let city = '';
  let state = '';
  let cep = '';

  if (!addressStr) return { street, number, neighborhood, city, state, cep };

  let working = addressStr.trim();

  // 1. Extract CEP (e.g. 58039-021 or 58039021)
  const cepMatch = working.match(/\\b\\d{5}-\\d{3}\\b|\\b\\d{8}\\b/);
  if (cepMatch) {
    cep = cepMatch[0];
    working = working.replace(cep, '').trim();
  }

  // 2. Extract State (UF) (e.g. PB, SP...) near the end
  const stateMatch = working.match(/[\\s,-]\\b([A-Z]{2})\\b\\s*$/) || working.match(/\\b([A-Z]{2})\\b\\s*$/);
  if (stateMatch) {
    state = stateMatch[1];
    working = working.substring(0, working.lastIndexOf(stateMatch[0])).trim();
  }

  // Remove trailing/leading punctuation
  working = working.replace(/[\\s,-]+$/, '').replace(/^[\\s,-]+/, '').trim();

  // 3. Extract Street and Number
  const firstCommaIdx = working.indexOf(',');
  if (firstCommaIdx !== -1) {
    street = working.substring(0, firstCommaIdx).trim();
    const rest = working.substring(firstCommaIdx + 1).trim();
    
    const numMatch = rest.match(/^([^,-]+)/);
    if (numMatch) {
      const possibleNum = numMatch[1].trim();
      if (/\\d/.test(possibleNum) || possibleNum.toLowerCase() === 's/n') {
        number = possibleNum;
        working = rest.substring(possibleNum.length).trim();
      } else {
        number = 'S/N';
        working = rest;
      }
    } else {
      working = rest;
    }
  } else {
    const firstHyphenIdx = working.indexOf('-');
    if (firstHyphenIdx !== -1) {
      street = working.substring(0, firstHyphenIdx).trim();
      working = working.substring(firstHyphenIdx).trim();
    } else {
      street = working;
      working = '';
    }
  }

  working = working.replace(/^[\\s,-]+/, '').replace(/[\\s,-]+$/, '').trim();

  // 4. Extract Neighborhood (Bairro) and City
  if (working) {
    const splitIdx = working.indexOf(',') !== -1 ? working.indexOf(',') : working.indexOf('-');
    if (splitIdx !== -1) {
      neighborhood = working.substring(0, splitIdx).trim();
      city = working.substring(splitIdx + 1).replace(/^[\\s,-]+/, '').trim();
    } else {
      city = working;
    }
  }

  return { street, number, neighborhood, city, state, cep };
};
`;

// Insert parseAddressString after extractCoordsFromUrl
const targetHelper = `const extractCoordsFromUrl = (url: string) => {
  if (!url) return null;
  const match1 = url.match(/!3d(-?\\d+\\.\\d+)!4d(-?\\d+\\.\\d+)/);
  if (match1) {
    return { lat: parseFloat(match1[1]), lng: parseFloat(match1[2]) };
  }
  const match2 = url.match(/@(-?\\d+\\.\\d+),(-?\\d+\\.\\d+)/);
  if (match2) {
    return { lat: parseFloat(match2[1]), lng: parseFloat(match2[2]) };
  }
  const match3 = url.match(/query=(-?\\d+\\.\\d+),(-?\\d+\\.\\d+)/);
  if (match3) {
    return { lat: parseFloat(match3[1]), lng: parseFloat(match3[2]) };
  }
  return null;
};`;

if (content.includes(targetHelper)) {
  content = content.replace(targetHelper, targetHelper + '\n' + parseAddressStringFn);
  console.log("Inserted parseAddressString helper.");
} else {
  console.error("Could not find extractCoordsFromUrl helper!");
  process.exit(1);
}

// 2. Update openDetails function to parse the address if it is not yet split
const targetOpenDetails = `  const openDetails = (restaurant: any) => {
    setSelectedRestaurant(restaurant);
    setEditedData(JSON.parse(JSON.stringify(restaurant)));
    setIsEditing(false);
    setActiveDialogTab('preview');
  };`;

const replacementOpenDetails = `  const openDetails = (restaurant: any) => {
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

if (content.includes(targetOpenDetails)) {
  content = content.replace(targetOpenDetails, replacementOpenDetails);
  console.log("Updated openDetails function.");
} else {
  console.error("Could not find openDetails function!");
  process.exit(1);
}

// 3. Update preview tab address display
const targetAddressPreview = `<p><span className="font-bold text-gray-500">Endereço:</span> {selectedRestaurant.address}, {selectedRestaurant.city} - {selectedRestaurant.state}</p>`;

const replacementAddressPreview = `<p>
                            <span className="font-bold text-gray-500">Endereço:</span>{' '}
                            {selectedRestaurant.address}
                            {selectedRestaurant.number ? \`, \${selectedRestaurant.number}\` : ''}
                            {selectedRestaurant.neighborhood ? \` - \${selectedRestaurant.neighborhood}\` : ''}
                            , {selectedRestaurant.city} - {selectedRestaurant.state}
                            {selectedRestaurant.cep ? \`, \${selectedRestaurant.cep}\` : ''}
                          </p>`;

if (content.includes(targetAddressPreview)) {
  content = content.replace(targetAddressPreview, replacementAddressPreview);
  console.log("Updated address preview.");
} else {
  console.error("Could not find address preview!");
  process.exit(1);
}

// 4. Update edit form address inputs
// Let's search for the block of inputs for Address/Phone and City/State/CEP in content
const targetFormInputs = `                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1 md:col-span-2">
                          <Label htmlFor="edit-address" className="text-xs font-bold">Endereço Completo</Label>
                          <Input 
                            id="edit-address"
                            value={editedData.address}
                            onChange={(e) => setEditedData({ ...editedData, address: e.target.value })}
                            className="bg-white border-gray-300 text-xs h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="edit-phone" className="text-xs font-bold">Telefone</Label>
                          <Input 
                            id="edit-phone"
                            value={editedData.phone}
                            onChange={(e) => setEditedData({ ...editedData, phone: e.target.value })}
                            className="bg-white border-gray-300 text-xs h-9"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <Label htmlFor="edit-city" className="text-xs font-bold">Cidade</Label>
                          <Input 
                            id="edit-city"
                            value={editedData.city}
                            onChange={(e) => setEditedData({ ...editedData, city: e.target.value })}
                            className="bg-white border-gray-300 text-xs h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="edit-state" className="text-xs font-bold">Estado (UF)</Label>
                          <Input 
                            id="edit-state"
                            value={editedData.state}
                            onChange={(e) => setEditedData({ ...editedData, state: e.target.value })}
                            className="bg-white border-gray-300 text-xs h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="edit-cep" className="text-xs font-bold">CEP</Label>
                          <Input 
                            id="edit-cep"
                            value={editedData.cep || ''}
                            onChange={(e) => setEditedData({ ...editedData, cep: e.target.value })}
                            className="bg-white border-gray-300 text-xs h-9"
                          />
                        </div>
                      </div>`;

const replacementFormInputs = `                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-1 md:col-span-2">
                          <Label htmlFor="edit-address" className="text-xs font-bold">Rua / Logradouro</Label>
                          <Input 
                            id="edit-address"
                            value={editedData.address || ''}
                            onChange={(e) => setEditedData({ ...editedData, address: e.target.value })}
                            className="bg-white border-gray-300 text-xs h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="edit-number" className="text-xs font-bold">Número</Label>
                          <Input 
                            id="edit-number"
                            value={editedData.number || ''}
                            onChange={(e) => setEditedData({ ...editedData, number: e.target.value })}
                            className="bg-white border-gray-300 text-xs h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="edit-phone" className="text-xs font-bold">Telefone</Label>
                          <Input 
                            id="edit-phone"
                            value={editedData.phone || ''}
                            onChange={(e) => setEditedData({ ...editedData, phone: e.target.value })}
                            className="bg-white border-gray-300 text-xs h-9"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <Label htmlFor="edit-neighborhood" className="text-xs font-bold">Bairro</Label>
                          <Input 
                            id="edit-neighborhood"
                            value={editedData.neighborhood || ''}
                            onChange={(e) => setEditedData({ ...editedData, neighborhood: e.target.value })}
                            className="bg-white border-gray-300 text-xs h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="edit-city" className="text-xs font-bold">Cidade</Label>
                          <Input 
                            id="edit-city"
                            value={editedData.city || ''}
                            onChange={(e) => setEditedData({ ...editedData, city: e.target.value })}
                            className="bg-white border-gray-300 text-xs h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="edit-state" className="text-xs font-bold">Estado (UF)</Label>
                          <Input 
                            id="edit-state"
                            value={editedData.state || ''}
                            onChange={(e) => setEditedData({ ...editedData, state: e.target.value })}
                            className="bg-white border-gray-300 text-xs h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="edit-cep" className="text-xs font-bold">CEP</Label>
                          <Input 
                            id="edit-cep"
                            value={editedData.cep || ''}
                            onChange={(e) => setEditedData({ ...editedData, cep: e.target.value })}
                            className="bg-white border-gray-300 text-xs h-9"
                          />
                        </div>
                      </div>`;

if (content.includes(targetFormInputs)) {
  content = content.replace(targetFormInputs, replacementFormInputs);
  console.log("Updated form inputs for address details.");
} else {
  console.error("Could not find form inputs section!");
  process.exit(1);
}

fs.writeFileSync(filePath, content);
console.log("All address edits applied successfully to ExportedRestaurants.tsx!");
