function App() {
    function handleClick(){}
    function handleClick1(){}
    function handerClick2(){}
    function handerClick3(){}
    function handleChange(){}
    
    return <div>
        <button onClick={handleClick}>点我一下</button>
        {/* <input  placeholder="请输入" onChange={handleChange}/> */}
        {/* <img src=""/> */}
    </div>
    // return <div onClick={ handerClick2 } onClickCapture={ handerClick3}  > 
    //     <button onClick={ handleClick }  onClickCapture={ handleClick1  }  className="button" >点击</button>
    // </div>
}

ReactDOM.render(<App/>, document.querySelector('#app'))