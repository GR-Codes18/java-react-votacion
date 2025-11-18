// src/services/data/congresistasService.js
const API_URL = "http://localhost:8080/api/congresistas";

export const getCongresistas = async () => {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error("Error al obtener congresistas");
        return await response.json();
    } catch (error) {
        console.error(error);
        return [];
    }
};