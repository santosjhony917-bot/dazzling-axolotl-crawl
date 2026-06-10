const fs = require('fs');
const path = require('path');

const rawData = [
  {
    "nome": "Mangai Cabo Branco",
    "categoria": "Regional",
    "nota": 4.8,
    "contagem_de_avaliacoes": 18500,
    "endereco_completo": "Av. Cabo Branco, 2190 - Cabo Branco, João Pessoa - PB, 58045-010",
    "telefone": "(83) 3247-9800",
    "midias_sociais": {
      "instagram": "https://www.instagram.com/mangai/",
      "facebook": "https://www.facebook.com/mangai/"
    },
    "horario_de_funcionamento": {
      "segunda_a_sabado": "11:30–22:00",
      "domingo": "11:30–22:00"
    },
    "site": "https://www.mangai.com.br/",
    "link_google_maps": "https://www.google.com/maps/place/Mangai+-+Cabo+Branco/@-7.1246757,-34.8197772,17z"
  },
  {
    "nome": "Nau Frutos do Mar",
    "categoria": "Frutos do Mar",
    "nota": 4.8,
    "contagem_de_avaliacoes": 14200,
    "endereco_completo": "Rua Odilon Fernandes, 120 - Manaíra, João Pessoa - PB, 58038-310",
    "telefone": "(83) 3246-8000",
    "midias_sociais": {
      "instagram": "https://www.instagram.com/naufrutosdomar/",
      "facebook": "https://www.facebook.com/naufrutosdomar/"
    },
    "horario_de_funcionamento": {
      "segunda_a_quinta": "12:00–15:00, 18:30–23:00",
      "sexta_a_sabado": "12:00–23:30",
      "domingo": "12:00–22:00"
    },
    "site": "https://www.naufrutosdomar.com.br/",
    "link_google_maps": "https://www.google.com/maps/place/Nau+Frutos+do+Mar/@-7.0984958,-34.8368146,17z"
  },
  {
    "nome": "Tábua de Carne Tambaú",
    "categoria": "Churrascaria",
    "nota": 4.7,
    "contagem_de_avaliacoes": 8500,
    "endereco_completo": "Av. Senador Ruy Carneiro, 302 - Tambaú, João Pessoa - PB, 58039-180",
    "telefone": "(83) 3247-5970",
    "midias_sociais": {
      "instagram": "https://www.instagram.com/tabuadecarne/",
      "facebook": "https://www.facebook.com/restaurantetabuadecarne/"
    },
    "horario_de_funcionamento": {
      "segunda_a_domingo": "11:30–15:30, 18:30–23:00"
    },
    "site": "http://www.tabuadecarne.com.br/",
    "link_google_maps": "https://www.google.com/maps/place/Restaurante+T%C3%A1bua+de+Carne/@-7.1147043,-34.8285565,17z"
  },
  {
    "nome": "Gusto Cucina Italiana",
    "categoria": "Italiana",
    "nota": 4.6,
    "contagem_de_avaliacoes": 980,
    "endereco_completo": "Av. Almirante Tamandaré, 612 - Tambaú, João Pessoa - PB, 58039-010",
    "telefone": "(83) 3512-9090",
    "midias_sociais": {
      "instagram": "https://www.instagram.com/gustocucina/",
      "facebook": "https://www.facebook.com/gustocucina/"
    },
    "horario_de_funcionamento": {
      "terca_a_domingo": "12:00–15:00, 18:30–23:00",
      "segunda": "Fechado"
    },
    "site": "https://gustocucina.com.br/",
    "link_google_maps": "https://www.google.com/maps/place/Gusto+Cucina+Italiana/@-7.119561,-34.8213271,17z"
  },
  {
    "nome": "Pizzaria Vignoli João Pessoa",
    "categoria": "Pizzaria",
    "nota": 4.5,
    "contagem_de_avaliacoes": 1800,
    "endereco_completo": "Av. Senador Ruy Carneiro, 502 - Tambaú, João Pessoa - PB, 58039-181",
    "telefone": "(83) 3247-9091",
    "midias_sociais": {
      "instagram": "https://www.instagram.com/pizzariavignoli/",
      "facebook": "https://www.facebook.com/pizzariavignoli/"
    },
    "horario_de_funcionamento": {
      "segunda_a_domingo": "18:00–23:30"
    },
    "site": "http://www.pizzariavignoli.com.br/",
    "link_google_maps": "https://www.google.com/maps/place/Pizzaria+Vignoli/@-7.113978,-34.830601,17z"
  },
  {
    "nome": "Família Muccini Ristorante",
    "categoria": "Italiana",
    "nota": 4.7,
    "contagem_de_avaliacoes": 2200,
    "endereco_completo": "Av. Cabo Branco, 1800 - Tambaú, João Pessoa - PB, 58045-010",
    "telefone": "(83) 3247-1600",
    "midias_sociais": {
      "instagram": "https://www.instagram.com/familiamuccini/",
      "facebook": "https://www.facebook.com/familiamucciniristorante/"
    },
    "horario_de_funcionamento": {
      "terca_a_domingo": "12:00–15:00, 18:30–23:30",
      "segunda": "Fechado"
    },
    "site": "http://www.familiamuccini.com.br/",
    "link_google_maps": "https://www.google.com/maps/place/Fam%C3%ADlia+Muccini/@-7.1215467,-34.8213324,17z"
  },
  {
    "nome": "Adega do Alfredo",
    "categoria": "Italiana",
    "nota": 4.7,
    "contagem_de_avaliacoes": 1800,
    "endereco_completo": "Rua Coração de Jesus, 147 - Tambaú, João Pessoa - PB, 58039-160",
    "telefone": "(83) 3247-3737",
    "midias_sociais": {
      "instagram": "https://www.instagram.com/adegadoalfredo/",
      "facebook": "https://www.facebook.com/adegadoalfredojp/"
    },
    "horario_de_funcionamento": {
      "segunda_a_sabado": "12:00–15:00, 19:00–23:30",
      "domingo": "12:00–16:00"
    },
    "site": "http://www.adegadoalfredo.com.br/",
    "link_google_maps": "https://www.google.com/maps/place/Adega+do+Alfredo/@-7.114757,-34.826078,17z"
  },
  {
    "nome": "IPPON Cozinha Japonesa",
    "categoria": "Japonesa",
    "nota": 4.8,
    "contagem_de_avaliacoes": 1400,
    "endereco_completo": "Av. Cabo Branco, 1600 - Cabo Branco, João Pessoa - PB, 58045-010",
    "telefone": "(83) 3247-5000",
    "midias_sociais": {
      "instagram": "https://www.instagram.com/ippon_jp/",
      "facebook": "https://www.facebook.com/ipponjp/"
    },
    "horario_de_funcionamento": {
      "segunda_a_domingo": "18:00–23:30"
    },
    "site": "http://www.ipponjp.com.br/",
    "link_google_maps": "https://www.google.com/maps/place/IPPON+Cozinha+Japonesa/@-7.1215467,-34.8213324,17z"
  },
  {
    "nome": "Canoa dos Camarões",
    "categoria": "Frutos do Mar",
    "nota": 4.6,
    "contagem_de_avaliacoes": 4200,
    "endereco_completo": "Av. Cabo Branco, 2630 - Cabo Branco, João Pessoa - PB, 58045-010",
    "telefone": "(83) 3247-2055",
    "midias_sociais": {
      "instagram": "https://www.instagram.com/canoadoscamaroes/",
      "facebook": "https://www.facebook.com/canoadoscamaroes/"
    },
    "horario_de_funcionamento": {
      "segunda_a_domingo": "11:30–23:00"
    },
    "site": "http://www.canoadoscamaroes.com.br/",
    "link_google_maps": "https://www.google.com/maps/place/Canoa+dos+Camar%C3%B5es/@-7.126462,-34.814272,17z"
  },
  {
    "nome": "Gulliver Mar",
    "categoria": "Frutos do Mar",
    "nota": 4.7,
    "contagem_de_avaliacoes": 2500,
    "endereco_completo": "Av. Cabo Branco, 5100 - Cabo Branco, João Pessoa - PB, 58045-010",
    "telefone": "(83) 3247-1190",
    "midias_sociais": {
      "instagram": "https://www.instagram.com/gullivermar/",
      "facebook": "https://www.facebook.com/gullivermar/"
    },
    "horario_de_funcionamento": {
      "terca_a_domingo": "12:00–16:00, 19:00–23:30",
      "segunda": "Fechado"
    },
    "site": "http://www.gulliverrestaurante.com.br/",
    "link_google_maps": "https://www.google.com/maps/place/Gulliver+Mar/@-7.147253,-34.795123,17z"
  },
  {
    "nome": "Bar do Cuscuz João Pessoa",
    "categoria": "Regional",
    "nota": 4.6,
    "contagem_de_avaliacoes": 12300,
    "endereco_completo": "Av. Cabo Branco, 1720 - Cabo Branco, João Pessoa - PB, 58045-010",
    "telefone": "(83) 3200-5000",
    "midias_sociais": {
      "instagram": "https://www.instagram.com/bardocuscuzjp/",
      "facebook": "https://www.facebook.com/bardocuscuzjp/"
    },
    "horario_de_funcionamento": {
      "segunda_a_domingo": "11:30–23:30"
    },
    "site": "http://www.bardocuscuz.com.br/",
    "link_google_maps": "https://www.google.com/maps/place/Bar+do+Cuscuz/@-7.1215467,-34.8213324,17z"
  },
  {
    "nome": "Olho de Lula",
    "categoria": "Frutos do Mar",
    "nota": 4.5,
    "contagem_de_avaliacoes": 4800,
    "endereco_completo": "Av. Cabo Branco, 2300 - Cabo Branco, João Pessoa - PB, 58045-010",
    "telefone": "(83) 3226-2000",
    "midias_sociais": {
      "instagram": "https://www.instagram.com/olhodelula/",
      "facebook": "https://www.facebook.com/olhodelulabar/"
    },
    "horario_de_funcionamento": {
      "segunda_a_domingo": "11:00–23:00"
    },
    "site": "http://www.olhodelula.com.br/",
    "link_google_maps": "https://www.google.com/maps/place/Olho+de+Lula/@-7.125134,-34.818290,17z"
  },
  {
    "nome": "Appétit Burger",
    "categoria": "Hamburgueria",
    "nota": 4.8,
    "contagem_de_avaliacoes": 2100,
    "endereco_completo": "Rua Bananeiras, 263 - Manaíra, João Pessoa - PB, 58038-120",
    "telefone": "(83) 3246-1212",
    "midias_sociais": {
      "instagram": "https://www.instagram.com/appetitburger/",
      "facebook": "https://www.facebook.com/appetitburger/"
    },
    "horario_de_funcionamento": {
      "segunda_a_domingo": "17:30–23:00"
    },
    "site": "http://www.appetitburger.com.br/",
    "link_google_maps": "https://www.google.com/maps/place/App%C3%A9tit+Burger/@-7.0984958,-34.8368146,17z"
  },
  {
    "nome": "Santa Grelha João Pessoa",
    "categoria": "Churrascaria",
    "nota": 4.7,
    "contagem_de_avaliacoes": 3200,
    "endereco_completo": "Av. Edson Ramalho, 200 - Manaíra, João Pessoa - PB, 58038-100",
    "telefone": "(83) 3200-4000",
    "midias_sociais": {
      "instagram": "https://www.instagram.com/santagrelhajoaopessoa/",
      "facebook": "https://www.facebook.com/santagrelhajoaopessoa/"
    },
    "horario_de_funcionamento": {
      "segunda_a_quinta": "12:00–15:00, 18:00–23:00",
      "sexta_a_sabado": "12:00–23:30",
      "domingo": "12:00–22:00"
    },
    "site": "http://www.socialclube.com.br/santa-grelha",
    "link_google_maps": "https://www.google.com/maps/place/Santa+Grelha/@-7.0984958,-34.8368146,17z"
  },
  {
    "nome": "Quintal do Picuí",
    "categoria": "Regional",
    "nota": 4.7,
    "contagem_de_avaliacoes": 1800,
    "endereco_completo": "Rua Escritor Sebastião de Castro, 100 - Bessa, João Pessoa - PB, 58035-130",
    "telefone": "(83) 3500-1010",
    "midias_sociais": {
      "instagram": "https://www.instagram.com/quintaldopicui/",
      "facebook": "https://www.facebook.com/quintaldopicui/"
    },
    "horario_de_funcionamento": {
      "terca_a_domingo": "11:30–16:00",
      "segunda": "Fechado"
    },
    "site": "https://quintaldopicui.com.br/",
    "link_google_maps": "https://www.google.com/maps/place/Quintal+do+Picu%C3%AD/@-7.0784958,-34.8368146,17z"
  },
  {
    "nome": "Bessa Grill",
    "categoria": "Regional",
    "nota": 4.5,
    "contagem_de_avaliacoes": 5400,
    "endereco_completo": "Av. Gov. Argemiro de Figueiredo, 345 - Bessa, João Pessoa - PB, 58037-030",
    "telefone": "(83) 3246-8888",
    "midias_sociais": {
      "instagram": "https://www.instagram.com/bessagrilloficial/",
      "facebook": "https://www.facebook.com/bessagrilloficial/"
    },
    "horario_de_funcionamento": {
      "segunda_a_domingo": "11:00–02:00"
    },
    "site": "http://www.bessagrill.com.br/",
    "link_google_maps": "https://www.google.com/maps/place/Bessa+Grill/@-7.0784958,-34.8368146,17z"
  },
  {
    "nome": "Unique Cafés Especiais",
    "categoria": "Cafeteria",
    "nota": 4.7,
    "contagem_de_avaliacoes": 650,
    "endereco_completo": "Av. Profa. Maria Sales, 294 - Tambaú, João Pessoa - PB, 58039-130",
    "telefone": "(83) 99318-5000",
    "midias_sociais": {
      "instagram": "https://www.instagram.com/uniquecafes/",
      "facebook": "https://www.facebook.com/uniquecafes/"
    },
    "horario_de_funcionamento": {
      "segunda_a_sabado": "13:00–21:00",
      "domingo": "Fechado"
    },
    "site": "http://www.uniquecafes.com.br/",
    "link_google_maps": "https://www.google.com/maps/place/Unique+Caf%C3%A9s/@-7.1147043,-34.8285565,17z"
  }
];

const unsplashImages = {
  "Regional": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800",
  "Frutos do Mar": "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800",
  "Churrascaria": "https://images.unsplash.com/photo-1544025162-d76694265947?w=800",
  "Italiana": "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800",
  "Pizzaria": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800",
  "Japonesa": "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800",
  "Hamburgueria": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800",
  "Cafeteria": "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800",
  "Restaurante": "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800"
};

function parseTimeString(timeStr) {
  const cleaned = timeStr.replace(/\s/g, '');
  const parts = cleaned.split(/[–-]/);
  if (parts.length === 2) {
    return { start: parts[0], end: parts[1] };
  }
  return null;
}

function parseSchedule(ptHours) {
  const weekDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const schedule = {};
  weekDays.forEach(day => {
    schedule[day] = { isOpen: false, slots: [] };
  });

  if (!ptHours) return schedule;
  
  for (const [key, value] of Object.entries(ptHours)) {
    if (value === "Fechado") continue;

    const slots = value.split(',').map(s => parseTimeString(s.trim())).filter(Boolean);
    if (slots.length === 0) continue;

    let targetDays = [];
    if (key === "segunda_a_domingo") {
      targetDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    } else if (key === "segunda_a_sabado") {
      targetDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    } else if (key === "segunda_a_quinta") {
      targetDays = ['monday', 'tuesday', 'wednesday', 'thursday'];
    } else if (key === "sexta_a_sabado") {
      targetDays = ['friday', 'saturday'];
    } else if (key === "terca_a_domingo") {
      targetDays = ['tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    } else if (key === "domingo") {
      targetDays = ['sunday'];
    } else if (key === "segunda") {
      targetDays = ['monday'];
    } else if (key === "terca") {
      targetDays = ['tuesday'];
    } else if (key === "quarta") {
      targetDays = ['wednesday'];
    } else if (key === "quinta") {
      targetDays = ['thursday'];
    } else if (key === "sexta") {
      targetDays = ['friday'];
    } else if (key === "sabado") {
      targetDays = ['saturday'];
    }

    targetDays.forEach(day => {
      schedule[day].isOpen = true;
      schedule[day].slots.push(...slots);
    });
  }

  return schedule;
}

const formattedRestaurants = rawData.map((item, idx) => {
  const cat = item.categoria || "Restaurante";
  const cover = unsplashImages[cat] || unsplashImages["Restaurante"];
  
  return {
    id: `scraped-joao-pessoa-real-${idx + 1}`,
    name: item.nome,
    category: cat,
    rating: item.nota,
    reviewsCount: item.contagem_de_avaliacoes,
    address: item.endereco_completo,
    phone: item.telefone,
    city: "João Pessoa",
    state: "PB",
    instagram: item.midias_sociais?.instagram || "",
    facebook: item.midias_sociais?.facebook || "",
    coverImage: cover,
    galleryImages: [cover],
    openingHours: parseSchedule(item.horario_de_funcionamento),
    website: item.site || "",
    googleMapsUrl: item.link_google_maps || ""
  };
});

const outputPath = path.resolve('c:/Users/meuno/Downloads/dazzling-axolotl-crawl-main/dazzling-axolotl-crawl-main/scraped_restaurants_joao_pessoa.json');
fs.writeFileSync(outputPath, JSON.stringify(formattedRestaurants, null, 2), 'utf-8');
console.log(`Successfully formatted and saved ${formattedRestaurants.length} restaurants to ${outputPath}`);
