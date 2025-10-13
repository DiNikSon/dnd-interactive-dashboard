import React, {useState, useEffect, useRef} from "react";
import XXH from "xxhashjs"

function hashObject(obj) {
  const ordered = JSON.stringify(obj, Object.keys(obj).sort());
  return XXH.h64(ordered, 0xABCD).toString(16);
}

export default function useLPSync(url) {
  const [data, setData] = useState({});
  const abortRef = useRef(null);

  useEffect(() => {
    const params = { t: Date.now(), hash: hashObject(data) };

    // Обертка для корректного управления жизненным циклом
    const start = async () => {
      abortRef.current = new AbortController();
      try {
        await subscribe(url, params, setData, console.error, abortRef.current.signal);
      } catch (e) {
        console.error(e);
      }
    };

    start();

    return () => {
      // Отменяем текущий запрос при изменении data или размонтировании
      if (abortRef.current) abortRef.current.abort();
    };
  }, [url, data]); // ✅ зависим от data, чтобы хэш пересчитывался

  return data;
}

async function subscribe(url, params, responseHandler, errorHandler, signal) {
  try { 
    const paramsEncoded = new URLSearchParams(params)
    const response = await fetch(url + '?' + paramsEncoded.toString(), { signal });

    if (response.status === 502) {
      await subscribe(url, params, responseHandler, errorHandler, signal);
    } else if (response.status !== 200) {
      errorHandler(await response.json());
      await new Promise((r) => setTimeout(r, 1000));
      await subscribe(url, params, responseHandler, errorHandler, signal);
    } else {
      const result = await response.json();
      responseHandler(result);
      await subscribe(url, params, responseHandler, errorHandler, signal);
    }
  } catch (e) {
    if (e.name !== "AbortError") {
      errorHandler(e);
      await new Promise((r) => setTimeout(r, 1000));
      await subscribe(url, params, responseHandler, errorHandler, signal);
    }
  }
}