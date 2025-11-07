import { useEffect, useState } from "react";
import * as v from "valibot";
import "./App.css";

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
    }),
  ),
});
type Pokemon = v.InferOutput<typeof PokemonSchema>;

function Card({
  pokemon,
  isCaptured,
  onRelease,
  onCapture,
  state,
}: {
  pokemon: Pokemon;
  isCaptured: boolean;
  onCapture?: () => void;
  onRelease?: () => void;
  state: "list" | "captured";
}) {
  const { name, sprites, types } = pokemon;
  const image = sprites.front_default;
  return (
    <div className="cardpokemon">
      <h2>{name}</h2>
      <img src={image} alt="pokemon" />
      <p className="type">{types.join(", ")}</p>
      {state === "list" ? (
        <button
          type="button"
          className="captureButton"
          onClick={onCapture}
          disabled={isCaptured}
        >
          {isCaptured ? "Captured" : "Capture"}
        </button>
      ) : (
        <button type="button" className="releaseButton" onClick={onRelease}>
          Release
        </button>
      )}
    </div>
  );
}

function Filters({
  filter,
  setFilter,
  types,
}: {
  filter: { name: string; type: string };
  setFilter: (value: { name: string; type: string }) => void;
  types: string[];
}) {
  return (
    <>
      <input
        value={filter.name}
        type="text"
        onChange={(event) => setFilter({ ...filter, name: event.target.value })}
      />
      <select
        value={filter.type}
        onChange={(event) => setFilter({ ...filter, type: event.target.value })}
      >
        <option value="">All types</option>
        {types.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>
    </>
  );
}

const PokemonsSchema = v.object({
  url: v.string(),
});

function App() {
  const [pokemons, setPokemons] = useState<Pokemon[]>([]);
  const [capturedList, setCapturedList] = useState<Pokemon[]>(() => {
    const savedPokemons = localStorage.getItem("savedpokemons");
    if (!savedPokemons) {
      return [];
    }
    const capturedPokemons = v.parse(v.array(PokemonSchema), savedPokemons);
    return capturedPokemons;
  });
  const [filter, setFilter] = useState({ name: "", type: "" });
  const AMOUNT = 10;

  useEffect(() => {
    async function run() {
      const response = await fetch(
        `https://pokeapi.co/api/v2/pokemon?limit=${AMOUNT}&offset=0`,
      );
      const data = await response.json();
      const parsed = v.parse(v.array(PokemonsSchema), data.results);
      const pokemons = await Promise.all(
        parsed.map(async (parsedPokemon) => {
          const responsePokemon = await fetch(parsedPokemon.url);
          const dataPokemon = await responsePokemon.json();
          const validatePokemon = v.parse(PokemonSchema, dataPokemon);
          return validatePokemon;
        }),
      );
      setPokemons(pokemons);
    }
    run();
  }, []);

  const filterTypes = pokemons
    .flatMap((p) => p.types.map((t) => t.type.name))
    .reduce<string[]>((acc, type) => {
      if (!acc.includes(type)) {
        acc.push(type);
      }
      return acc;
    }, []);

  const filterPokemons = pokemons
    .filter((pokemon) => {
      if (!filter.name) {
        return true;
      }
      return pokemon.name.toLowerCase().includes(filter.name.toLowerCase());
    })
    .filter((pokemon) => {
      if (!filter.type) {
        return true;
      }
      return pokemon.types.some((t) => t.type.name === filter.type);
    });

  return (
    <div className="pokedex">
      <Filters filter={filter} setFilter={setFilter} types={filterTypes} />
      <div className="list-pokemon">
        <h1>Pokedex</h1>
        {filterPokemons.map((pokemon) => {
          const isCaptured = capturedList.some(
            (captured) => captured.id === pokemon.id,
          );
          return (
            <Card
              key={pokemon.id}
              pokemon={pokemon}
              isCaptured={isCaptured}
              onCapture={() => {
                setCapturedList((capturedPokemons) => {
                  if (capturedPokemons.some((c) => c.id === pokemon.id))
                    return capturedPokemons;
                  const addedPokemons = [...capturedPokemons, pokemon];
                  localStorage.setItem(
                    "savedpokemons",
                    JSON.stringify(addedPokemons),
                  );
                  return addedPokemons;
                });
              }}
              state="list"
            />
          );
        })}
      </div>

      <div className="list-captured">
        <h1>Captured</h1>
        {capturedList.map((pokemon) => (
          <Card
            key={`captured-${pokemon.id}`}
            pokemon={pokemon}
            isCaptured={true}
            onRelease={() => {
              setCapturedList((capturedPokemons) => {
                const updatedList = capturedPokemons.filter(
                  (captured) => captured.id !== pokemon.id,
                );
                localStorage.setItem(
                  "savedpokemons",
                  JSON.stringify(updatedList),
                );
                return updatedList;
              });
            }}
            state="captured"
          />
        ))}
      </div>
    </div>
  );
}

export default App;
