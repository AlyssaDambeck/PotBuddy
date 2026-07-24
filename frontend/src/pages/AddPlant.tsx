import { useState } from "react";


function AddPlant() {
    const [nickname, setNickname] = useState("")

  return (
    <div className="w-full h-full">
      <h1>Add Plant</h1>
      <div>
        <form className="flex flex-col">
          <div className="flex flex-row">
            <p>SpeciesID</p>
            <input onInput={(e)=>{
                setNickname(e.target.value)
            }}></input>
          </div>
          <div className="flex flex-row">
            <p>Nickname</p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddPlant;
