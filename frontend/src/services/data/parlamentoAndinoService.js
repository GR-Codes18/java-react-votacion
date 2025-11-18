// src/services/data/parlamentoAndinoService.js
const API_URL = "http://localhost:8080/api/parlamento-andino";

export const getParlamentoAndino = async () => {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error("Error al obtener parlamento andino");
        return await response.json();
    } catch (error) {
        console.error(error);
        return [];
    }
};