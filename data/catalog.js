"use strict";

const catalogElement = document.getElementById("catalog");
const categoryFilter = document.getElementById("categoryFilter");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const resetButton = document.getElementById("resetFilters");
const resultCount = document.getElementById("resultCount");

let allProducts = [];

const categoryImages = {
    "Книги": "product-01.svg",
    "Курсы": "product-02.svg",
    "Инструменты": "product-03.svg"
};

function parseCSV(csvText) {
    const lines = csvText.replace(/^\uFEFF/, "").trim().split(/\r?\n/);
    const headers = lines.shift()?.split(";").map(item => item.trim());
    const expected = ["id", "name", "category", "price", "rating"];

    if (!headers || expected.some((field, index) => headers[index] !== field)) {
        throw new Error("Неверный формат catalog.csv");
    }

    const products = lines.filter(line => line.trim()).map((line, index) => {
        const columns = line.split(";").map(item => item.trim());
        if (columns.length !== expected.length) {
            throw new Error(`Неверное количество полей в строке ${index + 2}`);
        }

        const [id, name, category, price, rating] = columns;
        const product = {
            id: Number(id),
            name,
            category,
            price: Number(price),
            rating: Number(rating)
        };

        if (!Number.isInteger(product.id) || !name || !category ||
            !Number.isFinite(product.price) || product.price < 0 ||
            !Number.isFinite(product.rating)) {
            throw new Error(`Некорректные данные в строке ${index + 2}`);
        }

        return product;
    });

    if (products.length === 0) {
        throw new Error("В каталоге нет товаров");
    }
    return products;
}

function makeTextElement(tag, className, text) {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = text;
    return element;
}

function createCard(product) {
    const card = document.createElement("article");
    card.className = "card";
    card.dataset.id = String(product.id);

    const image = document.createElement("img");
    image.className = "card__image";
    image.src = `dataset/assets/${categoryImages[product.category] || "product-01.svg"}`;
    image.alt = `Иллюстрация: ${product.name}`;
    image.loading = "lazy";

    const body = document.createElement("div");
    body.className = "card__body";

    const category = makeTextElement("span", "card__category", product.category);
    const title = makeTextElement("h3", "card__title", product.name);
    const meta = document.createElement("div");
    meta.className = "card__meta";

    const price = new Intl.NumberFormat("ru-RU", {
        style: "currency", currency: "RUB", maximumFractionDigits: 0
    }).format(product.price);

    meta.append(
        makeTextElement("strong", "card__price", price),
        makeTextElement("span", "card__rating", `★ ${product.rating.toFixed(1)}`)
    );
    body.append(category, title, meta);
    card.append(image, body);
    return card;
}

function showMessage(message, isError = false) {
    const notice = makeTextElement("p", "notice" + (isError ? " notice--error" : ""), message);
    if (isError) notice.setAttribute("role", "alert");
    catalogElement.replaceChildren(notice);
}

function renderProducts(products) {
    resultCount.textContent = `Найдено: ${products.length} из ${allProducts.length}`;
    if (products.length === 0) {
        showMessage("По выбранным условиям товары не найдены.");
        return;
    }
    const fragment = document.createDocumentFragment();
    products.forEach(product => fragment.append(createCard(product)));
    catalogElement.replaceChildren(fragment);
}

function applyFilters() {
    const query = searchInput.value.trim().toLocaleLowerCase("ru");
    const selectedCategory = categoryFilter.value;

    const filtered = allProducts.filter(product => {
        const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
        const matchesSearch = product.name.toLocaleLowerCase("ru").includes(query);
        return matchesCategory && matchesSearch;
    });

    if (sortSelect.value === "priceAsc") {
        filtered.sort((a, b) => a.price - b.price);
    } else if (sortSelect.value === "priceDesc") {
        filtered.sort((a, b) => b.price - a.price);
    } else if (sortSelect.value === "ratingDesc") {
        filtered.sort((a, b) => b.rating - a.rating || a.id - b.id);
    }

    renderProducts(filtered);
}

async function loadCatalog() {
    try {
        const response = await fetch("dataset/catalog.csv");
        if (!response.ok) {
            throw new Error(`Ошибка HTTP ${response.status}`);
        }
        allProducts = parseCSV(await response.text());

        const categories = [...new Set(allProducts.map(product => product.category))];
        categories.forEach(category => {
            const option = document.createElement("option");
            option.value = category;
            option.textContent = category;
            categoryFilter.append(option);
        });
        applyFilters();
    } catch (error) {
        console.error("Ошибка загрузки каталога:", error);
        resultCount.textContent = "Ошибка загрузки";
        showMessage("Не удалось загрузить данные. Проверьте dataset/catalog.csv и запуск через Live Server.", true);
    }
}

searchInput.addEventListener("input", applyFilters);
categoryFilter.addEventListener("change", applyFilters);
sortSelect.addEventListener("change", applyFilters);
resetButton.addEventListener("click", () => {
    searchInput.value = "";
    categoryFilter.value = "all";
    sortSelect.value = "default";
    applyFilters();
});

loadCatalog();
