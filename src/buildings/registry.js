/* ---------- authoritative building definitions ---------- */
// Keep buildable metadata here so placement, tools, saves, services and future
// upgrades can share one source of truth without turning index.html back into a
// monolith. Runtime-only UI modes (move/look/remove) remain outside the registry.
export const BUILDINGS={
  road:{id:"road",name:"Road",category:"ways",cost:3,key:"2",description:"Homes need a road alongside them. Drag to draw — water becomes a bridge.",renderKey:"road",placement:{waterSpan:true},destination:{walk:true},saveDefaults:{}},
  rail:{id:"rail",name:"Rail",category:"ways",cost:8,key:"3",description:"Draw a loop and trains will run it on their own. Crosses water too.",renderKey:"rail",placement:{waterSpan:true},destination:{rail:true},saveDefaults:{}},
  station:{id:"station",name:"Station",category:"ways",cost:110,key:"0",description:"Must touch a rail tile. Lifts homes for six tiles.",renderKey:"station",placement:{requiresAdjacent:"rail"},destination:{work:true,visit:true},saveDefaults:{}},
  dock:{id:"dock",name:"Dock",category:"ways",cost:70,key:"d",description:"Must touch water. Boats put out from here and sail the lake.",renderKey:"dock",placement:{requiresAdjacentWater:true},destination:{work:true,visit:true},saveDefaults:{}},
  house:{id:"house",name:"House",category:"homes",cost:24,key:"4",description:"Four neighbours move in once they're happy.",renderKey:"house",placement:{},destination:{home:true},saveDefaults:{education:0}},
  school:{id:"school",name:"School",category:"homes",cost:145,key:"c",description:"Provides gradual education to nearby households, with room for 28 students.",renderKey:"school",placement:{},service:{type:"education",radius:5,capacity:28},destination:{work:true,visit:true},upgrades:[{level:1,capacity:28,radius:5}],saveDefaults:{level:1}},
  cafe:{id:"cafe",name:"Café",category:"trade",cost:55,key:"5",description:"Earns coins every day and cheers up the street.",renderKey:"cafe",placement:{},destination:{work:true,visit:true},saveDefaults:{}},
  market:{id:"market",name:"Market",category:"trade",cost:130,key:"r",description:"A hub for trade — lifts what every café and bakery nearby takes.",renderKey:"market",placement:{},destination:{work:true,visit:true},saveDefaults:{}},
  bakery:{id:"bakery",name:"Bakery",category:"trade",cost:80,key:"k",description:"Bakes what the windmills grind. Wants a mill within four tiles.",renderKey:"bakery",placement:{},destination:{work:true,visit:true},saveDefaults:{}},
  mill:{id:"mill",name:"Windmill",category:"trade",cost:95,key:"9",description:"Grinds coin every day — most of all at harvest. Wants open ground.",renderKey:"mill",placement:{},destination:{work:true},saveDefaults:{}},
  park:{id:"park",name:"Park",category:"green",cost:40,key:"6",description:"The strongest mood lift, out to four tiles.",renderKey:"park",placement:{},destination:{visit:true},saveDefaults:{}},
  tree:{id:"tree",name:"Trees",category:"green",cost:2,key:"7",description:"A small, cheap lift. Nice along a road.",renderKey:"tree",placement:{},destination:{},saveDefaults:{}},
  lamp:{id:"lamp",name:"Lamp",category:"green",cost:9,key:"8",description:"A small lift that doubles after dark. Line them along a street.",renderKey:"lamp",placement:{},destination:{},saveDefaults:{}}
};

export const BUILDABLE=Object.freeze(Object.fromEntries(Object.keys(BUILDINGS).map(id=>[id,1])));
export const BUILDING_COST=Object.freeze(Object.fromEntries(Object.values(BUILDINGS).map(d=>[d.id,d.cost])));

export function getBuildingDefinition(id){ return BUILDINGS[id]||null; }
export function getServiceDefinition(id){ const d=getBuildingDefinition(id); return d&&d.service?d.service:null; }
export function buildingToolDefinitions(){
  return Object.values(BUILDINGS).map(d=>({id:d.id,name:d.name,cost:d.cost,key:d.key,desc:d.description,cat:d.category}));
}
export function defaultBuildingState(id){
  const d=getBuildingDefinition(id);
  return d&&d.saveDefaults?{...d.saveDefaults}:{};
}
