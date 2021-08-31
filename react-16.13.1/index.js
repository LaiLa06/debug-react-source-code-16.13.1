function App() {
    const [count, setCount] = React.useState(0)
    function handleClick(){

    }
    return <div>
        <button onClick={handleClick}>点我一下xxx</button>
    </div>
}

ReactDOM.render(<App/>, document.querySelector('#app'))