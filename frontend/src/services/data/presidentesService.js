// src/services/data/presidentesService.js
const API_URL = "http://localhost:8080/api/presidentes";

export const getPresidentes = async () => {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error("Error al obtener presidentes");
        return await response.json();
    } catch (error) {
        console.error(error);
        return [];
    }
};

// Aquí pondremos el POST más adelante
// export const createPresidente = async (data) => { ... }