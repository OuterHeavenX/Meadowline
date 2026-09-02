/* ---------- authoritative building definitions ---------- */
// Buildable metadata, unlock stage and civic upgrades live here so placement,
// tools, saves, services and future milestones share one source of truth.
export const BUILDINGS={
  road:{id:"road",name:"Road",category:"ways",cost:3,key:"2",unlockStage:1,description:"Homes need a road alongside them. Drag to draw — water becomes a bridge.",renderKey:"road",placement:{waterSpan:true,footprint:[1,1]},destination:{walk:true},saveDefaults:{}},
  rail:{id:"rail",name:"Rail",category:"ways",cost:8,key:"3",upkeep:1,unlockStage:3,description:"Draw a loop and trains will run it on their own. Crosses water too.",renderKey:"rail",placement:{waterSpan:true,footprint:[1,1]},destination:{rail:true},saveDefaults:{}},
  station:{id:"station",name:"Station",category:"ways",cost:110,key:"0",upkeep:6,unlockStage:3,description:"Must touch a rail tile. Lifts homes for six tiles.",renderKey:"station",jobs:4,placement:{footprint:[1,1],requiresAdjacent:"rail"},destination:{work:true,visit:true},saveDefaults:{}},
  dock:{id:"dock",name:"Dock",category:"ways",cost:70,key:"d",upkeep:4,unlockStage:4,description:"Must touch water. Boats put out from here and sail the lake.",renderKey:"dock",jobs:4,placement:{footprint:[1,1],requiresAdjacentWater:true},destination:{work:true,visit:true},saveDefaults:{}},
  house:{
    id:"house",name:"House",category:"homes",cost:24,key:"4",unlockStage:1,
    description:"A starter home that can gradually grow with a strong neighborhood.",
    renderKey:"house",placement:{footprint:[1,1]},destination:{home:true},
    housing:{tiers:[
      {id:1,name:"Cottage",capacity:4,taxMultiplier:1,upgradeSeconds:0,requirements:{}},
      {id:2,name:"Town Home",capacity:6,taxMultiplier:1.25,upgradeSeconds:50,requirements:{road:true,mood:65,education:15,desirability:45}},
      {id:3,name:"Established Home",capacity:8,taxMultiplier:1.55,upgradeSeconds:85,requirements:{road:true,mood:78,education:35,desirability:62}}
    ]},
    saveDefaults:{education:0,housingTier:1,upgradeProgress:0,desirability:0,recreationSatisfaction:0}
  },
  school:{
    id:"school",name:"School",category:"homes",cost:145,key:"c",upkeep:12,unlockStage:2,
    description:"Provides gradual education across a neighborhood, with room for 28 students.",
    renderKey:"school",jobs:7,placement:{footprint:[1,1]},service:{type:"education",radius:7,capacity:28,visual:{boundary:"green"}},destination:{work:true,visit:true},
    upgrades:[
      {level:1,name:"Schoolhouse",capacity:28,radius:7,renderVariant:"school-1"},
      {level:2,name:"Expanded School",cost:650,requiresStage:3,capacity:44,radius:7,renderVariant:"school-2",description:"Adds classroom space without stretching neighborhood coverage."}
    ],
    saveDefaults:{level:1}
  },
  cityHall:{
    id:"cityHall",name:"Town Office",category:"civic",cost:90,key:"h",upkeep:4,unlockStage:1,unique:true,
    description:"Meadowline's civic center. Inspect it for citywide goals, growth, land, finances and services.",
    renderKey:"cityHall",jobs:6,placement:{footprint:[1,1]},destination:{work:true,visit:true},
    upgrades:[
      {level:1,name:"Town Office",requiresStage:1,renderVariant:"city-hall-1"},
      {level:2,name:"Village Hall",cost:280,requiresStage:2,renderVariant:"city-hall-2",description:"A proper hall for a growing Village."},
      {level:3,name:"Town Hall",cost:520,requiresStage:3,renderVariant:"city-hall-3",description:"A larger civic building with a recognizable cupola."},
      {level:4,name:"Meadowline City Hall",cost:850,requiresStage:4,renderVariant:"city-hall-4",description:"The mature civic heart of Meadowline."}
    ],
    saveDefaults:{level:1}
  },
  policeStation:{id:"policeStation",name:"Police Station",category:"safety",cost:420,key:"j",upkeep:18,unlockStage:2,description:"2×2 · Dispatches cruisers to bounded neighborhood incidents.",renderKey:"policeStation",placement:{footprint:[2,2]},service:{type:"safety",radius:9,capacity:2},jobs:8,destination:{work:true,service:true},saveDefaults:{}},
  fireStation:{id:"fireStation",name:"Fire Station",category:"safety",cost:520,key:"f",upkeep:22,unlockStage:3,description:"2×3 · Sends engines to rare, recoverable building fires.",renderKey:"fireStation",placement:{footprint:[2,3]},service:{type:"fire",radius:10,capacity:2},jobs:10,destination:{work:true,service:true},saveDefaults:{}},
  clinic:{id:"clinic",name:"Clinic",category:"health",cost:460,key:"v",upkeep:20,unlockStage:3,description:"2×2 · Treats seasonal illness and dispatches an ambulance.",renderKey:"clinic",placement:{footprint:[2,2]},service:{type:"healthcare",radius:9,capacity:18},jobs:9,destination:{work:true,service:true},saveDefaults:{}},
  hospital:{id:"hospital",name:"Hospital",category:"health",cost:780,key:"x",upkeep:34,unlockStage:4,description:"3×3 · A larger healthcare facility for a Growing Town.",renderKey:"hospital",placement:{footprint:[3,3]},service:{type:"healthcare",radius:12,capacity:42},jobs:18,destination:{work:true,service:true},saveDefaults:{}},
  cafe:{id:"cafe",name:"Café",category:"trade",cost:55,key:"5",upkeep:3,unlockStage:1,description:"Earns coins every day and cheers up the street.",renderKey:"cafe",placement:{footprint:[1,1]},jobs:5,destination:{work:true,visit:true},saveDefaults:{}},
  market:{id:"market",name:"Market",category:"trade",cost:130,key:"r",upkeep:6,unlockStage:2,description:"A hub for trade — lifts what every café and bakery nearby takes.",renderKey:"market",jobs:8,placement:{footprint:[1,1]},destination:{work:true,visit:true},saveDefaults:{}},
  bakery:{id:"bakery",name:"Bakery",category:"trade",cost:80,key:"k",upkeep:4,unlockStage:2,description:"Bakes what the windmills grind. Wants a mill within four tiles.",renderKey:"bakery",jobs:6,placement:{footprint:[1,1]},destination:{work:true,visit:true},saveDefaults:{}},
  farm:{id:"farm",name:"Farm",category:"trade",cost:90,upkeep:3,key:"n",unlockStage:2,description:"3×3 · Grows the grain the windmills grind. Wants open ground and room to spread.",renderKey:"farm",jobs:6,placement:{footprint:[3,3]},destination:{work:true},saveDefaults:{}},
  mill:{id:"mill",name:"Windmill",category:"trade",cost:95,key:"9",upkeep:4,unlockStage:3,description:"Grinds coin every day — most of all at harvest. Wants open ground.",renderKey:"mill",jobs:5,placement:{footprint:[1,1]},destination:{work:true},saveDefaults:{}},

  // The production `park` ID stays 1×1 forever so old V3 cities remain intact.
  // Recreation 2.0 treats it as a generous legacy small green rather than
  // expanding it into neighboring player property.
  park:{id:"park",name:"Pocket Green",category:"green",cost:65,key:"6",upkeep:1,unlockStage:1,description:"A classic 1×1 neighborhood green. Cheap on land, but a real park lifts a neighborhood further.",renderKey:"park",placement:{footprint:[1,1]},service:{type:"recreation",radius:4,capacity:8,quality:1},destination:{visit:true,recreation:true},saveDefaults:{}},

  pocketPark:{id:"pocketPark",name:"Pocket Park",category:"recreation",cost:70,key:"a",upkeep:1,unlockStage:1,description:"2×2 · A real little public park for a small neighborhood.",renderKey:"pocketPark",placement:{footprint:[2,2]},service:{type:"recreation",radius:5,capacity:12,quality:1.15},destination:{visit:true,recreation:true},saveDefaults:{}},
  playground:{id:"playground",name:"Playground",category:"recreation",cost:95,key:"g",upkeep:2,unlockStage:2,description:"2×2 · Family recreation with a compact neighborhood reach.",renderKey:"playground",placement:{footprint:[2,2]},service:{type:"recreation",radius:5,capacity:18,quality:1.2},destination:{visit:true,recreation:true},saveDefaults:{}},
  picnicGreen:{id:"picnicGreen",name:"Picnic Green",category:"recreation",cost:150,key:"q",upkeep:3,unlockStage:2,description:"3×3 · Lawn, shade and gathering room for a busier neighborhood.",renderKey:"picnicGreen",placement:{footprint:[3,3]},service:{type:"recreation",radius:6,capacity:24,quality:1.25},destination:{visit:true,recreation:true},saveDefaults:{}},
  sportsCourt:{id:"sportsCourt",name:"Sports Court",category:"recreation",cost:190,key:"u",upkeep:4,unlockStage:3,description:"2×3 · A compact multi-use court with meaningful Recreation capacity.",renderKey:"sportsCourt",placement:{footprint:[2,3]},service:{type:"recreation",radius:6,capacity:28,quality:1.3},destination:{visit:true,recreation:true},saveDefaults:{}},
  townPark:{id:"townPark",name:"Town Park",category:"recreation",cost:340,key:"y",upkeep:8,unlockStage:4,description:"4×4 · A major public-space anchor for a Growing Town.",renderKey:"townPark",placement:{footprint:[4,4]},service:{type:"recreation",radius:8,capacity:55,quality:1.5},destination:{visit:true,recreation:true},saveDefaults:{}},

  tree:{id:"tree",name:"Trees",category:"green",cost:2,key:"7",unlockStage:1,description:"A small, cheap lift. Nice along a road.",renderKey:"tree",placement:{footprint:[1,1]},destination:{},saveDefaults:{}},
  lamp:{id:"lamp",name:"Lamp",category:"green",cost:9,key:"8",unlockStage:1,description:"A small lift that doubles after dark. Line them along a street.",renderKey:"lamp",placement:{footprint:[1,1]},destination:{},saveDefaults:{}},

  // ---------- wonders ----------
  // Wonders take the Shift layer. Every unshifted key is already spoken for -
  // all ten digits and every letter the shell has not reserved - so the four
  // of them share one modifier rather than scattering into the last three
  // gaps. An uppercase tool key means Shift, and input.js resolves the exact
  // case before it lowercases for the ordinary tools.
  // Deliberately out of reach for a long time. A wonder costs several paydays
  // of a mature city and carries an upkeep a small town cannot afford, so it
  // is something a city grows into rather than something it buys early. Each
  // one moves a different lever, so the order you build them is a real choice.
  statue:{id:"statue",name:"Meadow Statue",category:"wonder",cost:1400,upkeep:12,key:"O",unlockStage:3,unique:true,
    description:"2×2 · A monument to the valley. Every household in Meadowline is a little prouder of where it lives.",
    renderKey:"statue",jobs:2,placement:{footprint:[2,2]},destination:{visit:true},saveDefaults:{}},
  clockTower:{id:"clockTower",name:"Clock Tower",category:"wonder",cost:2200,upkeep:18,key:"T",unlockStage:4,unique:true,
    description:"2×2 · The whole town keeps the same hour. Every café, market and bakery takes more.",
    renderKey:"clockTower",jobs:3,placement:{footprint:[2,2]},destination:{visit:true},saveDefaults:{}},
  lighthouse:{id:"lighthouse",name:"Lighthouse",category:"wonder",cost:2600,upkeep:20,key:"Z",unlockStage:4,unique:true,
    description:"2×2 · Must stand at the water's edge. Guides the boats in, and every dock in the valley starts to pay.",
    renderKey:"lighthouse",jobs:3,placement:{footprint:[2,2],requiresAdjacentWater:true},destination:{visit:true},saveDefaults:{}},
  greatLibrary:{id:"greatLibrary",name:"Great Library",category:"wonder",cost:3600,upkeep:26,key:"G",unlockStage:4,unique:true,
    description:"3×3 · Teaches the whole valley at once — a school's reach, for a city.",
    renderKey:"greatLibrary",jobs:14,placement:{footprint:[3,3]},service:{type:"education",radius:16,capacity:90,visual:{boundary:"green"}},destination:{work:true,visit:true},saveDefaults:{}}
};

export const BUILDABLE=Object.freeze(Object.fromEntries(Object.keys(BUILDINGS).map(id=>[id,1])));
export const BUILDING_COST=Object.freeze(Object.fromEntries(Object.values(BUILDINGS).map(d=>[d.id,d.cost])));
// What each building asks of the treasury every payday. Absent means free to
// keep: roads, trees and lamps are the fabric of the town rather than a line
// on its budget.
export const BUILDING_UPKEEP=Object.freeze(Object.fromEntries(Object.values(BUILDINGS).map(d=>[d.id,d.upkeep||0])));
export const WONDERS=Object.freeze(Object.values(BUILDINGS).filter(d=>d.category==='wonder').map(d=>d.id));

export function getBuildingDefinition(id){ return BUILDINGS[id]||null; }
export function getServiceDefinition(id){ const d=getBuildingDefinition(id); return d&&d.service?d.service:null; }
export function getUpgradeDefinition(id,level){ const d=getBuildingDefinition(id); return d?.upgrades?.find(u=>u.level===level)||null; }
export function buildingToolDefinitions(){
  return Object.values(BUILDINGS).map(d=>({id:d.id,name:d.name,cost:d.cost,upkeep:d.upkeep||0,key:d.key,desc:d.description,cat:d.category,unlockStage:d.unlockStage||1}));
}
export function defaultBuildingState(id){
  const d=getBuildingDefinition(id);
  return d&&d.saveDefaults?{...d.saveDefaults}:{};
}
