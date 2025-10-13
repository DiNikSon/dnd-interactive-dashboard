import React, { useState, useEffect } from "react";
import { subscribe } from "../modules/long-polling";

function poke(){
  fetch('/api/poke-test')
}



export default function Home() {
  const [feed, setFeed] = useState([])

  function poked(a){
    setFeed(f=>[...f, a.message])
  }
   useEffect(() => {
      subscribe('/api/subscribe-test?t=' + Date.now(), (a)=>{poked(a)}, (e)=>{console.error(e)})
    }, []); // empty 2nd arg - only runs once

    return <>
      <h1>Sender</h1>
      <button onClick={poke}>Poke</button>
      {feed.map(f=><h3>{f}</h3>)}
    </>
}