import "./style.css";
import Rx from "rx";
import Cycle from "@cycle/core";
import { makeDOMDriver, div, h1, input, button, ul, li } from "@cycle/dom";
import storageDriver from "@cycle/storage";

function intent({ DOM }) {
  const text$ = DOM.select(".text").events("change")
    .map(e => e.target.value);
  const save$ = DOM.select(".save").events("click");
  const todo$ = save$.withLatestFrom(text$, (save, text) => text);

  return { todo$ };
}

function store(reducer$, initialState$) {
  return initialState$.take(1)
    .merge(reducer$)
    .scan((state, reducer) => reducer(state))
    .shareReplay(1);
}

function model({ todo$ }, localStorage) {
  const newTodo$ = todo$.map(todo => state =>
    ({ ...state, todos: [ ...state.todos, todo ] }));

  const reducer$ = Rx.Observable.merge(newTodo$);
  const initialState$ = localStorage.getItem("app")
    .map(serialized => serialized ? JSON.parse(serialized) : { todos: [] });
  const state$ = store(reducer$, initialState$);

  return state$;
}

function view(state$) {
  return state$.map(state => div([
    input(".text", { type: "text" }),
    button(".save", ["Save"]),
    ul(state.todos.map(todo => li([todo])))
  ]));
}

function main(sources) {
  const state$ = model(intent(sources), sources.storage.local);
  const storage$ = state$.map(state => ({
    key: "app",
    value: JSON.stringify(state),
  }))
  const sinks = {
    DOM: view(state$),
    storage: storage$,
  };
  return sinks;
}

Cycle.run(main, {
  DOM: makeDOMDriver("#root"),
  storage: storageDriver,
});
