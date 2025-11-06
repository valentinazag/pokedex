import { useEffect, useState } from 'react';
import * as v from 'valibot';
import './App.css';

const PokemonSchema = v.object({
  id: v.number(),
  name: v.string(),
  sprites: v.object({
  front_default: v.string(),
  }),
  types: v.array(
    v.object({
      type: v.object({
        name: v.string(),
      }),
    })
  ),
});

type Pokemon = v.InferOutput<typeof PokemonSchema>;

type CardProps = {
  name: string;
  image: string;
  type: string[];
  isCaptured: boolean;
  onCapture?: () => void;
  onRelease?: () => void;
  state: 'list' | 'captured';
};


function Card({ name, image, type, isCaptured, onRelease, onCapture,state }: CardProps) {
  return (
    <div className='cardpokemon'>
      <h2>{name}</h2>
      <img src={image} alt='pokemon' />
      <p className='type'>{type.join(', ')}</p>
       {state === 'list' ? (
        <button
          type='button'
          className='captureButton'
          onClick={onCapture}
          disabled={isCaptured}
        >
          {isCaptured ? 'Captured' : 'Capture'}
        </button>
      ) : (
        <button
          type='button'
          className='releaseButton'
          onClick={onRelease}
        >
        Release
        </button>
      )}
    </div>
  );
}
type filterProps ={
  filter: {name: string, type: string},
  setFilter: (value: {name: string, type: string}) => void;
  types: string[];
}

function Filter ({filter , setFilter, types}: filterProps){
  return(
    <>
    <input value= {filter.name} type="text" onChange={(f) => setFilter({...filter, name:f.target.value})}/>
      <select
        value={filter.type}
        onChange={(e) => setFilter({ ...filter, type: e.target.value })}>
        <option value="">All types</option>
        {types.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>
    </>
  )
}


function App() {
  const [pokemons, setPokemons] = useState<Pokemon[]>([]);
 const [capturedList, setCapturedList] = useState<Pokemon[]>(() => {
  const capturatedpokemons = localStorage.getItem("savedpokemons");
  return capturatedpokemons ? JSON.parse(capturatedpokemons) : [];
});
  const [filter, setFilter] = useState({ name: '', type: '' });
  const AMOUNT = 10;

function capturePokemon(p: Pokemon) {
  setCapturedList((capturedPokemons) => {
    if (capturedPokemons.some((c) => c.id === p.id)) return capturedPokemons; 
    const addedPokemons =  [...capturedPokemons, p];
    localStorage.setItem("savedpokemons", JSON.stringify(addedPokemons))
    return addedPokemons;
      
  });
}

function releasePokemon(p: Pokemon) {
  setCapturedList((capturedPokemons) => {
    const updatedList = capturedPokemons.filter((c) => c.id !== p.id);
    localStorage.setItem("savedpokemons", JSON.stringify(updatedList));
    return updatedList;
  });
}


  useEffect(() => {
    async function run() {
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=${AMOUNT}&offset=0`);
      const data = await response.json();

      const PokemonsSchema = v.object({
        url: v.string(),
      });

      const parsed = v.parse(v.array(PokemonsSchema), data.results);

      const pokemons: Pokemon[] = [];
      for (const p of parsed) {
        const responsePokemon = await fetch(p.url);
        const dataPokemon = await responsePokemon.json();
        const validatePokemon = v.parse(PokemonSchema, dataPokemon);
        pokemons.push(validatePokemon);
      }

      setPokemons(pokemons);
    }
    run();
  }, []);

const filterTypes = pokemons
  .flatMap((p) => p.types.map((t) => t.type.name))
  .reduce<string[]>((acc, type) => {
  if (!acc.includes(type)) {
    acc.push(type)
  }
  return acc
}, []);

 const filterPokemons = pokemons.filter((p) => {
  const filterName = p.name.toLowerCase().includes(filter.name.toLowerCase());
  const filterType =
  filter.type === '' || p.types.some((t) => t.type.name === filter.type);
  return filterName && filterType;
});

  return (
    <div className='pokedex'>
    <Filter filter={filter} setFilter={setFilter} types= {filterTypes}/>
     <div className='list-pokemon'>
  <h1>Pokedex</h1>
  {filterPokemons.map((p) => {
    const isCaptured = capturedList.some((c) => c.id === p.id);
    return (
      <Card
        key={p.id}
        name={p.name}
        image={p.sprites.front_default}
        type={p.types.map((t) => t.type.name)}
        isCaptured={isCaptured}
        onCapture={() => capturePokemon(p)}
        state='list'
      />
    );
  })}
</div>

<div className='list-captured'>
  <h1>Captured</h1>
  {capturedList.map((p) => (
    <Card
      key={`captured-${p.id}`}
      name={p.name}
      image={p.sprites.front_default}
      type={p.types.map((t) => t.type.name)}
      isCaptured={true}
      onRelease={() => releasePokemon(p)}
      state='captured'
    />
  ))}
 </div>
</div>
  );
}

export default App;
