// src/pages/votar/Votar.jsx
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Vote, Crown, Globe, Building2 } from "lucide-react";
import { useLocation, Navigate, useNavigate } from "react-router-dom";

import { registrarVoto } from "../../services/votosService";
import { getPresidentes } from "../../services/data/presidentesService";
import { getCongresistas } from "../../services/data/congresistasService";
import { getParlamentoAndino } from "../../services/data/parlamentoAndinoService";

import ProgressCard from "./ProgressCard";
import Categorias from "./Categorias";
import Candidatos from "./Candidatos";
import Congresistas from "./Congresistas";
import ParliamentoAndino from "./ParliamentoAndino";
import Final from "./Final";

/** Categorías disponibles */
const categoriasVotacion = [
  {
    id: "presidente",
    titulo: "Presidente y Vicepresidentes",
    subtitulo: "de la República",
    icono: Crown,
    color: "from-blue-500 to-blue-600",
    descripcion: "Elige a tu fórmula presidencial",
  },
  {
    id: "congresistas",
    titulo: "Congresistas",
    subtitulo: "de la República",
    icono: Building2,
    color: "from-green-500 to-green-600",
    descripcion: "Elige a tus representantes en el Congreso",
  },
  {
    id: "parlamentoAndino",
    titulo: "Parlamento Andino",
    subtitulo: "Representantes Regionales",
    icono: Globe,
    color: "from-purple-500 to-purple-600",
    descripcion: "Elige a tus representantes regionales",
  },
];

export default function Votar() {
  // obtener datos de la página anterior
  const location = useLocation();
  const navigate = useNavigate();
  const datosVerificacion = location.state || {};

  // si no hay datos mínimos, redirigir a verificacion
  if (!Object.keys(datosVerificacion).length) {
    return <Navigate to="/verificacion" replace />;
  }

  const votante = datosVerificacion.votante || datosVerificacion.ciudadano || {};
  const departamento = datosVerificacion.departamento || votante.departamento || "";
  const provincia = datosVerificacion.provincia || votante.provincia || "";
  const distrito = datosVerificacion.distrito || votante.distrito || "";

  // empezamos en el paso 2 (categorías) y con el DNI verificado
  const [paso, setPaso] = useState(2);
  const [dni, setDni] = useState(datosVerificacion.dni || votante.dni || "");

  // estados del proceso
  const [categoriaActual, setCategoriaActual] = useState(null);
  const [votosRealizados, setVotosRealizados] = useState({});
  const [error, setError] = useState("");
  const [candidatosData, setCandidatosData] = useState({
    presidente: [],
    congresistas: [],
    parlamentoAndino: [],
  });
  const [cargandoCandidatos, setCargandoCandidatos] = useState(true);

  // animación común
  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  // cargar candidatos (una sola vez)
  useEffect(() => {
    let mounted = true;

    const cargarCandidatosAsync = async () => {
      setCargandoCandidatos(true);
      try {
        const [presidentesData, congresistasData, parlamentoAndinoData] =
          await Promise.all([
            getPresidentes(),
            getCongresistas(),
            getParlamentoAndino(),
          ]);

        const datosCombinados = {
          presidente: presidentesData || [],
          congresistas: congresistasData || [],
          parlamentoAndino: parlamentoAndinoData || [],
        };

        if (mounted) {
          setCandidatosData(datosCombinados);
          setCargandoCandidatos(false);
        }
      } catch (err) {
        console.error("Error cargando candidatos:", err);
        if (mounted) {
          setCandidatosData({
            presidente: [],
            congresistas: [],
            parlamentoAndino: [],
          });
          setCargandoCandidatos(false);
        }
      }
    };

    cargarCandidatosAsync();

    return () => {
      mounted = false;
    };
  }, []);

  const seleccionarCategoria = (categoria) => {
    setCategoriaActual(categoria);
    setPaso(3);
    setError("");
  };

  const obtenerCargoSimplificado = (categoriaId) => {
    const cargoMap = {
      presidente: "Presidente",
      congresistas: "Congresista",
      parlamentoAndino: "Parlamentario Andino",
    };
    return cargoMap[categoriaId] || "DESCONOCIDO";
  };

  /**
   * confirmarVotoDirecto
   * candidatoVotado puede ser:
   * - null o { esNulo: true } para voto nulo
   * - { id, nombre, partidoNombre } para voto simple
   * - { preferenciales: [id1, id2,...], candidatos: [...] } para congresistas preferenciales
   */
  const confirmarVotoDirecto = async (candidatoVotado) => {
    setError("");
    try {
      // helper para buscar candidato por id en el cache
      const findCandidateById = (id) => {
        if (!id) return null;
        for (const key of Object.keys(candidatosData)) {
          const arr = candidatosData[key] || [];
          const f = arr.find((c) => String(c.id) === String(id));
          if (f) return f;
        }
        return null;
      };

      const idCandidato =
        candidatoVotado?.id !== undefined
          ? candidatoVotado.id
          : candidatoVotado?.idCandidato ?? null;

      const cargoVotado = obtenerCargoSimplificado(categoriaActual?.id);

      // caso voto nulo
      if (idCandidato === null || candidatoVotado?.esNulo) {
        await registrarVoto(dni, null, cargoVotado, null, null);
      } else if (
        candidatoVotado?.preferenciales &&
        Array.isArray(candidatoVotado.preferenciales)
      ) {
        // votos preferenciales (congresistas)
        // Se asume que candidatoVotado.candidatos contiene los datos de la lista
        for (const idPref of candidatoVotado.preferenciales) {
          try {
            // buscar datos dentro del objeto si vienen
            const candidatoEncontrado =
              (candidatoVotado.candidatos || []).find(
                (c) => String(c.id) === String(idPref)
              ) || findCandidateById(idPref);

            const nombre = candidatoEncontrado?.nombre || candidatoEncontrado?.nombre_completo || null;
            const partido = candidatoEncontrado?.partidoNombre || candidatoEncontrado?.partido || null;

            await registrarVoto(dni, idPref, cargoVotado, nombre, partido);
          } catch (errInner) {
            console.error("Error registrando preferencial", idPref, errInner);
            // continuar con los siguientes preferenciales
          }
        }
      } else {
        // voto válido simple
        let nombre = candidatoVotado?.nombre || candidatoVotado?.nombreCompleto || candidatoVotado?.nombre_completo || null;
        let partido = candidatoVotado?.partidoNombre || candidatoVotado?.partido || null;

        // si no vienen los datos, intentar del cache
        if (!nombre || !partido) {
          const cand = findCandidateById(idCandidato);
          if (cand) {
            nombre = nombre || cand.nombre || cand.nombre_completo || null;
            partido = partido || cand.partidoNombre || cand.partido || null;
          }
        }

        await registrarVoto(dni, idCandidato, cargoVotado, nombre, partido);
      }

      // actualizar estado local de votos realizados
      const nuevosVotos = {
        ...votosRealizados,
        [categoriaActual.id]: candidatoVotado || { esNulo: true },
      };
      setVotosRealizados(nuevosVotos);

      // comprobar si ya votó todas las categorías
      const categoriasVotadas = Object.keys(nuevosVotos).length;
      const categoriasRequeridas = categoriasVotacion.length;

      if (categoriasVotadas === categoriasRequeridas) {
        setCategoriaActual(null);
        setPaso(5); // ir a final
      } else {
        // volver a lista de categorías para votar siguiente
        setCategoriaActual(null);
        setPaso(2);
      }
    } catch (err) {
      console.error("Error registrando voto:", err);
      setError(err?.message || "No se pudo registrar el voto");
    }
  };

  const volverACategorias = () => {
    setCategoriaActual(null);
    setPaso(2);
    setError("");
  };

  const reiniciar = () => {
    // mandarlo a verificación para empezar de nuevo
    navigate("/verificacion", { replace: true });
  };

  const obtenerCandidatos = () => {
    if (!categoriaActual) return [];
    const categoriaKey =
      categoriaActual.id === "parlamentoAndino"
        ? "parlamentoAndino"
        : categoriaActual.id;
    return candidatosData[categoriaKey] || [];
  };

  const categoriasPendientes = categoriasVotacion.filter(
    (cat) => !votosRealizados[cat.id]
  );

  const progreso =
    (Object.keys(votosRealizados).length / categoriasVotacion.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8FAFC] to-white py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Vote className="w-8 h-8 text-[#2563EB]" />
            <h1 className="text-4xl font-bold text-[#1E3A8A]">Realiza tu voto</h1>
          </div>
        </motion.div>

        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="p-4 mb-6 bg-blue-50 border border-blue-200 rounded-lg text-sm">
          <p className="font-semibold text-blue-800">
            Votante: {votante.nombres || votante.nombre_completo || votante.nombre} {votante.apellidos || ""} ({dni})
          </p>
          <p className="text-gray-600">
            Ubicación: {distrito}, {provincia}, {departamento}
          </p>
        </motion.div>

        {/* Progreso */}
        {paso < 5 && (
          <ProgressCard
            fadeUp={fadeUp}
            votosRealizados={votosRealizados}
            categorias={categoriasVotacion}
            progreso={progreso}
          />
        )}

        <AnimatePresence mode="wait">
          {paso === 2 && (
            <Categorias
              key="paso2"
              fadeUp={fadeUp}
              categorias={categoriasVotacion}
              votosRealizados={votosRealizados}
              categoriasPendientes={categoriasPendientes}
              onSeleccionarCategoria={seleccionarCategoria}
              onIrFinal={() => setPaso(5)}
            />
          )}

          {paso === 3 && categoriaActual && categoriaActual.id === "presidente" && (
            <Candidatos
              key="paso3-presidente"
              categoriaActual={categoriaActual}
              candidatos={obtenerCandidatos()}
              onConfirmarVoto={confirmarVotoDirecto}
              onVolverCategorias={volverACategorias}
              cargando={cargandoCandidatos}
              error={error}
            />
          )}

          {paso === 3 && categoriaActual && categoriaActual.id === "congresistas" && (
            <Congresistas
              key="paso3-congreso"
              categoriaActual={categoriaActual}
              candidatos={obtenerCandidatos()}
              onConfirmarVoto={confirmarVotoDirecto}
              onVolverCategorias={volverACategorias}
              cargando={cargandoCandidatos}
              error={error}
            />
          )}

          {paso === 3 && categoriaActual && categoriaActual.id === "parlamentoAndino" && (
            <ParliamentoAndino
              key="paso3-parlamento"
              categoriaActual={categoriaActual}
              candidatos={obtenerCandidatos()}
              onConfirmarVoto={confirmarVotoDirecto}
              onVolverCategorias={volverACategorias}
              cargando={cargandoCandidatos}
              error={error}
            />
          )}

          {paso === 5 && (
            <Final
              key="paso5"
              fadeUp={fadeUp}
              votosRealizados={votosRealizados}
              categoriasVotacion={categoriasVotacion}
              onReiniciar={reiniciar}
              dni={dni}
            />
          )}
        </AnimatePresence>

        {error && (
          <div className="mt-6 text-red-600 text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>
    </div>
  );
}
