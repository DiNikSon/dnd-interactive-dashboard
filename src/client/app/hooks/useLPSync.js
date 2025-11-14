import React, {useState, useEffect, useRef} from "react";
import XXH from "xxhashjs"

function hashObject(obj) {
  const ordered = JSON.stringify(sortObjectKeys(obj));
  return XXH.h64(ordered, 0xABCD).toString(16);
}

function sortObjectKeys(obj) {
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  } else if (obj && typeof obj === "object" && obj.constructor === Object) {
    return Object.keys(obj)
      .sort()
      .reduce((acc, key) => {
        acc[key] = sortObjectKeys(obj[key]);
        return acc;
      }, {});
  }
  return obj;
}

export default function useLPSync(subUrl, setUrl, keys = null){
  if(!keys)return useLPSyncSingle(subUrl, setUrl)
  return useLPSyncMulti(subUrl, setUrl, keys)
}

function useLPSyncSingle(subUrl, setUrl) {
  const [data, setData] = useState({});
  const localUpdateRef = useRef(false)
  const abortRef = useRef(null);

  function set(newData){
    let updatedData = {...data, ...((typeof newData === 'function')?newData(data):newData)}
    localUpdateRef.current = fetch(setUrl, {
      method: 'PUT',
      body: JSON.stringify(updatedData),
      headers: {
        'Content-Type': 'application/json'
      },
    });
    setData(updatedData)
  }

  useEffect(() => {
    const params = { t: Date.now(), hash: hashObject(data) };

    // Обертка для корректного управления жизненным циклом
    const start = async () => {
      abortRef.current = new AbortController();
      try {
        await Promise.resolve(localUpdateRef.current);
        await subscribe(subUrl, params, setData, console.error, abortRef.current.signal);
      } catch (e) {
        console.error(e);
      }
    };

    start();

    return () => {
      // Отменяем текущий запрос при изменении data или размонтировании
      if (abortRef.current) abortRef.current.abort();
    };
  }, [subUrl, data]); // ✅ зависим от data, чтобы хэш пересчитывался

  return [data, set];
}

function useLPSyncMulti(subUrl, setUrl, keys) {
  
  const [data, setData] = useState(Object.fromEntries(keys.map(k=>[k,{}])));
  const localUpdateRef = useRef(false)
  const abortRef = useRef(null);

  function set(newData, key){
    let updatedData = {...data}
    updatedData[key] =  {...updatedData[key], ...((typeof newData === 'function')?newData(data):newData)}
    localUpdateRef.current = fetch(setUrl + key, {
      method: 'PUT',
      body: JSON.stringify(updatedData[key]),
      headers: {
        'Content-Type': 'application/json'
      },
    });
    setData(updatedData)
  }

  useEffect(() => {
    const params = { t: Date.now(), hash: hashObject(data) };

    // Обертка для корректного управления жизненным циклом
    const start = async () => {
      abortRef.current = new AbortController();
      try {
        
        //console.log(subUrl + keys.join('+'), params, setData, console.error, abortRef.current.signal)
        await Promise.resolve(localUpdateRef.current);
        await subscribe(subUrl + keys.join('+'), params, setData, console.error, abortRef.current.signal);
      } catch (e) {
        console.error(e);
      }
    };

    start();

    return () => {
      // Отменяем текущий запрос при изменении data или размонтировании
      if (abortRef.current) abortRef.current.abort();
    };
  }, [subUrl, data]); // ✅ зависим от data, чтобы хэш пересчитывался


  return keys.flatMap(k=>[data[k],(v)=>set(v,k)]);
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