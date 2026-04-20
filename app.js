// CONFIGURAÇÕES
const CONFIG = {
    STORE_NAME: "Cachorro Quente do Pará",
    WHATSAPP_NUMBER: "5521988137667",
    API_URL: "https://script.google.com/macros/s/AKfycbyHBfOtO_zJDTWV_tdLlLSbQbxP8zsqe8I8i1s0PnbITFqS7J7mF-zlhD49_spyUA0aig/exec"
};

// ESTADO DA APLICAÇÃO
let allProducts = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let currentCategory = 'todos';
let deliveryFee = 0;

// ELEMENTOS DOM
const productGrid = document.getElementById('product-grid');
const loading = document.getElementById('loading');
const emptyMsg = document.getElementById('empty-msg');
const cartCount = document.getElementById('cart-count');
const cartItems = document.getElementById('cart-items');
const cartTotalValue = document.getElementById('cart-total-value');
const cartSubtotal = document.getElementById('cart-subtotal');
const floatingCart = document.getElementById('floating-cart');
const floatingTotal = document.getElementById('floating-total');
const floatingCount = document.getElementById('floating-count');
const categoryList = document.getElementById('category-list');

// INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    updateCartUI();
    setupMask();
});

// FORMATADORES
function toBRL(val) {
    const num = typeof val === 'number' ? val : parseFloat(val);
    return isNaN(num) ? 'R$ 0,00' : num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatPrice(val) {
    if (typeof val === 'number') return val;
    let clean = String(val || "").replace('R$', '').replace(/\s/g, '').replace(',', '.');
    return parseFloat(clean) || 0;
}

// BUSCA DE DADOS
async function fetchProducts() {
    loading.classList.remove('hidden');
    try {
        const response = await fetch(`${CONFIG.API_URL}?action=produtos`);
        const data = await response.json();

        allProducts = data.map(p => ({
            id: String(p.id || Math.random()),
            nome: p.nome || p.Nome || "Produto",
            descrição: p.descricao || p.Descrição || "",
            categoria: p.categoria || p.Categoria || "Diversos",
            preço: formatPrice(p.preco || p.Preço || p.valor),
            imagem: p.imagem || p.Imagem || p.foto,
            ativo: p.ativo !== undefined ? (String(p.ativo).toUpperCase() === 'TRUE' || p.ativo === 1) : true,
            opcoes: p.opcoes || [] // Espera um array de { nome: 'P', preço: 10 }
        }));

        renderCategories();
        renderProducts(allProducts);
    } catch (error) {
        console.error("Erro:", error);
        renderMockData();
    } finally {
        loading.classList.add('hidden');
    }
}

// RENDERIZAÇÃO
function createProductCard(p) {
    const isAvailable = p.ativo;
    const hasOptions = p.opcoes && p.opcoes.length > 0;
    const card = document.createElement('div');
    card.className = "product-card p-4 flex gap-4 relative";
    card.innerHTML = `
        <div class="flex-1">
            <h3 class="font-bold text-base text-slate-800 leading-tight mb-1">${p.nome}</h3>
            <p class="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">${p.descrição}</p>
            <p class="text-[#b91c1c] font-extrabold text-base">${hasOptions ? 'A partir de ' : ''}${toBRL(p.preço)}</p>
        </div>
        <div class="w-24 h-24 flex-shrink-0 relative">
            <img src="${p.imagem || 'https://via.placeholder.com/150'}" class="w-full h-full object-cover rounded-2xl bg-slate-100" alt="${p.nome}" onerror="this.src='https://via.placeholder.com/150?text=Sem+Foto'">
            ${!isAvailable ? '<div class="absolute inset-0 bg-white/80 backdrop-blur-[1px] flex items-center justify-center rounded-2xl text-[10px] font-bold text-red-600 uppercase text-center p-1">Esgotado</div>' : ''}
            <button
                onclick="${hasOptions ? `openOptions('${p.id}')` : `addToCart('${p.id}', this)`}"
                ${!isAvailable ? 'disabled' : ''}
                class="absolute -bottom-2 -right-2 btn-add shadow-lg"
            >
                <i class="fa-solid fa-plus text-sm"></i>
            </button>
        </div>
    `;
    return card;
}

function renderProducts(products) {
    productGrid.innerHTML = '';
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const filtered = products.filter(p =>
        (currentCategory === 'todos' || p.categoria === currentCategory) &&
        (p.nome.toLowerCase().includes(searchTerm) || p.descrição.toLowerCase().includes(searchTerm))
    );

    if (filtered.length === 0) {
        emptyMsg.classList.remove('hidden');
        return;
    }
    emptyMsg.classList.add('hidden');

    if (currentCategory === 'todos' && searchTerm === '') {
        const categories = [...new Set(allProducts.map(p => p.categoria))];
        categories.forEach(cat => {
            const catProducts = filtered.filter(p => p.categoria === cat);
            if (catProducts.length > 0) {
                const title = document.createElement('h2');
                title.className = "section-title";
                title.innerText = cat;
                productGrid.appendChild(title);
                catProducts.forEach(p => productGrid.appendChild(createProductCard(p)));
            }
        });
    } else {
        filtered.forEach(p => productGrid.appendChild(createProductCard(p)));
    }
}

function renderCategories() {
    const categories = ['todos', ...new Set(allProducts.map(p => p.categoria))];
    categoryList.innerHTML = '';
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = `category-chip ${currentCategory === cat ? 'active' : ''}`;
        btn.innerText = cat === 'todos' ? 'Todos' : cat;
        btn.onclick = () => {
            currentCategory = cat;
            renderCategories();
            renderProducts(allProducts);
        };
        categoryList.appendChild(btn);
    });
}

// BUSCA
document.getElementById('search-input').addEventListener('input', () => renderProducts(allProducts));

// CARRINHO
function openOptions(id) {
    const p = allProducts.find(p => p.id === id);
    if (!p) return;

    const content = document.getElementById('options-content');
    content.innerHTML = `
        <div class="flex gap-4 mb-6">
            <img src="${p.imagem}" class="w-20 h-20 rounded-2xl object-cover">
            <div>
                <h3 class="font-bold text-lg">${p.nome}</h3>
                <p class="text-xs text-slate-400">${p.descrição}</p>
            </div>
        </div>
        <div class="space-y-3">
            <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">Escolha o tamanho:</p>
            ${p.opcoes.map(opt => `
                <button onclick="addToCart('${p.id}', null, '${opt.nome}', ${opt.preço})" class="w-full flex justify-between items-center p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all border border-transparent hover:border-[#b91c1c]/20 group">
                    <span class="font-bold text-slate-700">${opt.nome}</span>
                    <div class="flex items-center gap-3">
                        <span class="font-extrabold text-[#b91c1c]">${toBRL(opt.preço)}</span>
                        <i class="fa-solid fa-chevron-right text-[10px] text-slate-300 group-hover:text-[#b91c1c]"></i>
                    </div>
                </button>
            `).join('')}
        </div>
    `;

    document.getElementById('options-modal').classList.remove('translate-y-full');
    document.getElementById('options-overlay').classList.add('open');
}

function closeOptionsModal() {
    document.getElementById('options-modal').classList.add('translate-y-full');
    document.getElementById('options-overlay').classList.remove('open');
}

function addToCart(id, btn, variantName = null, variantPrice = null) {
    const product = allProducts.find(p => p.id === id);
    if (!product) return;

    const cartId = variantName ? `${id}-${variantName}` : id;
    const finalPrice = variantPrice !== null ? variantPrice : product.preço;
    const finalName = variantName ? `${product.nome} (${variantName})` : product.nome;

    const existing = cart.find(item => item.cartId === cartId);
    if (existing) {
        existing.quantity++;
    } else {
        cart.push({
            ...product,
            cartId,
            nomeExibicao: finalName,
            preço: finalPrice,
            quantity: 1
        });
    }

    saveCart();
    updateCartUI();

    if (variantName) closeOptionsModal();

    // Animação de feedback
    if(btn) {
        btn.classList.add('scale-125');
        setTimeout(() => btn.classList.remove('scale-125'), 200);
    }
}

function updateCartUI() {
    const subtotal = cart.reduce((acc, item) => acc + (item.preço * item.quantity), 0);
    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

    const isDelivery = document.getElementById('delivery-type').value === 'entrega';
    const currentFee = isDelivery ? deliveryFee : 0;
    const totalValue = subtotal + currentFee;

    cartCount.innerText = totalItems;
    cartCount.classList.toggle('hidden', totalItems === 0);

    floatingCart.classList.toggle('hidden', totalItems === 0);
    if (totalItems > 0) {
        setTimeout(() => floatingCart.classList.remove('translate-y-20'), 100);
        floatingTotal.innerText = toBRL(totalValue);
        floatingCount.innerText = `${totalItems} ${totalItems === 1 ? 'item' : 'itens'}`;
    }

    // Exibe ou oculta a linha da taxa de entrega
    const deliveryRow = document.getElementById('delivery-row');
    if (isDelivery && subtotal > 0) {
        deliveryRow.classList.remove('hidden');
        document.getElementById('cart-delivery').innerText = toBRL(currentFee);
    } else {
        deliveryRow.classList.add('hidden');
    }

    cartItems.innerHTML = '';
    cart.forEach(item => {
        const div = document.createElement('div');
        div.className = "flex items-center gap-4 bg-slate-50 p-3 rounded-2xl";
        div.innerHTML = `
            <div class="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                <img src="${item.imagem}" class="w-full h-full object-cover">
            </div>
            <div class="flex-1">
                <h4 class="font-bold text-sm text-slate-800 line-clamp-1">${item.nomeExibicao || item.nome}</h4>
                <p class="text-[#b91c1c] font-bold text-sm">${toBRL(item.preço * item.quantity)}</p>
            </div>
            <div class="flex items-center gap-3 bg-white px-2 py-1 rounded-xl border border-slate-100">
                <button onclick="changeQty('${item.cartId || item.id}', -1)" class="text-[#b91c1c] font-bold px-1">-</button>
                <span class="text-xs font-bold w-4 text-center">${item.quantity}</span>
                <button onclick="changeQty('${item.cartId || item.id}', 1)" class="text-[#b91c1c] font-bold px-1">+</button>
            </div>
        `;
        cartItems.appendChild(div);
    });

    if(cart.length === 0) {
        cartItems.innerHTML = `
            <div class="text-center py-10">
                <i class="fa-solid fa-cart-shopping text-slate-200 text-4xl mb-4"></i>
                <p class="text-slate-400 font-medium">Sua sacola está vazia</p>
            </div>
        `;
    }

    cartSubtotal.innerText = toBRL(subtotal);
    cartTotalValue.innerText = toBRL(totalValue);
}

function changeQty(cartId, delta) {
    const item = cart.find(i => (i.cartId || i.id) === cartId);
    if (item) {
        item.quantity += delta;
        if (item.quantity <= 0) cart = cart.filter(i => (i.cartId || i.id) !== cartId);
        saveCart();
        updateCartUI();
    }
}

function saveCart() { localStorage.setItem('cart', JSON.stringify(cart)); }

function toggleCart() {
    document.getElementById('cart-drawer').classList.toggle('open');
    document.getElementById('cart-overlay').classList.toggle('open');
}

// CHECKOUT
function openCheckout() {
    if (cart.length === 0) return;
    document.getElementById('checkout-modal').classList.remove('translate-y-full');
    document.getElementById('checkout-overlay').classList.add('open');
}

function closeCheckout() {
    document.getElementById('checkout-modal').classList.add('translate-y-full');
    document.getElementById('checkout-overlay').classList.remove('open');
}

function toggleAddress() {
    const isDelivery = document.getElementById('delivery-type').value === 'entrega';
    document.getElementById('address-field').classList.toggle('hidden', !isDelivery);
    if (!isDelivery) {
        deliveryFee = 0;
        document.getElementById('client-neighborhood').value = "0";
    }
    updateCartUI();
}

function updateDeliveryFee() {
    const select = document.getElementById('client-neighborhood');
    deliveryFee = parseFloat(select.value) || 0;
    updateCartUI();
}

document.getElementById('checkout-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('send-btn');
    const originalContent = btn.innerHTML;

    const neighborhoodSelect = document.getElementById('client-neighborhood');
    const neighborhoodOption = neighborhoodSelect.options[neighborhoodSelect.selectedIndex];
    const neighborhoodName = neighborhoodOption.text.split(' - ')[0];

    const formData = {
        cliente: document.getElementById('client-name').value,
        telefone: document.getElementById('client-phone').value,
        tipo: document.getElementById('delivery-type').value,
        pagamento: document.getElementById('payment-method').value,
        bairro: neighborhoodName,
        taxa: toBRL(deliveryFee),
        endereco: document.getElementById('client-street').value,
        notas: document.getElementById('notes').value,
        total: cartTotalValue.innerText,
        itens: cart.map(i => `${i.nomeExibicao || i.nome} ${toBRL(i.preço)} (x${i.quantity})`).join('\n')
    };

    try {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-circle-notch animate-spin"></i> Enviando...';

        // Enviar para Planilha (opcional)
        await fetch(CONFIG.API_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(formData)
        }).catch(() => {});

        // Preparar mensagem WhatsApp organizada com Negrito
        let msg = `*Novo Pedido - ${CONFIG.STORE_NAME}*\n\n`;
        msg += `*Cliente:* ${formData.cliente}\n`;
        msg += `*WhatsApp:* ${formData.telefone}\n`;
        msg += `*Tipo:* ${formData.tipo === 'entrega' ? 'Entrega 🚀' : 'Retirada 🥡'}\n`;

        if(formData.tipo === 'entrega') {
            msg += `*Bairro:* ${formData.bairro}\n`;
            msg += `*Endereço:* ${formData.endereco}\n`;
        }

        msg += `*Pagamento:* ${formData.pagamento}\n`;
        msg += `*Produtos:* \n${formData.itens}\n`;

        if(formData.notas) msg += `*Obs:* ${formData.notas}\n`;

        if(formData.tipo === 'entrega') {
            msg += `*Taxa de Entrega:* ${formData.taxa}\n`;
        }

        msg += `*Total: ${formData.total}*`;

        window.open(`https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');

        cart = []; saveCart(); updateCartUI(); closeCheckout(); toggleCart();
    } catch (err) {
        alert("Ocorreu um erro ao processar seu pedido.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalContent;
    }
});

function setupMask() {
    const tel = document.getElementById('client-phone');
    tel.addEventListener('input', (e) => {
        let v = e.target.value.replace(/\D/g, '');
        v = v.replace(/^(\d{2})(\d)/g, '($1) $2');
        v = v.replace(/(\d{5})(\d)/, '$1-$2');
        e.target.value = v.substring(0, 15);
    });
}

function renderMockData() {
    allProducts = [
        { id: "1", nome: "Combo Burger Salada", descrição: "Burger artesanal 160g, queijo prato, alface, tomate e maionese da casa. Acompanha batata frita e refrigerante.", categoria: "Combos", preço: 26.50, imagem: "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=300", ativo: true, opcoes: [] },
        { id: "2", nome: "Pizza Artesanal", descrição: "Massa de fermentação natural com ingredientes selecionados.", categoria: "Pizzas", preço: 35.00, imagem: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300", ativo: true, opcoes: [
            { nome: "Média (6 fatias)", preço: 35.00 },
            { nome: "Grande (8 fatias)", preço: 45.00 },
            { nome: "Família (12 fatias)", preço: 60.00 }
        ]},
        { id: "3", nome: "Cheese Burger Tradicional", descrição: "Pão brioche, carne 160g e queijo derretido.", categoria: "Burgers", preço: 19.90, imagem: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=300", ativo: true, opcoes: [] }
    ];
    renderCategories();
    renderProducts(allProducts);
}
