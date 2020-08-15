import React, { useState, useReducer, useEffect, Suspense } from "react";
import ReactDOM from "react-dom";
import { useImmerReducer } from "use-immer";
import { BrowserRouter, Switch, Route } from "react-router-dom";
import { CSSTransition } from "react-transition-group";
import Axios from "axios";
Axios.defaults.baseURL = process.env.BACKENDURL || "";

//  My components
import DispatchContext from "./DispatchContext";
import StateContext from "./StateContext";
import About from "./components/About";
import EditPost from "./components/EditPost";
import FlashMessages from "./components/FlashMessages";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Home from "./components/Home";
import HomeGuest from "./components/HomeGuest";
import LoadingDotsIcon from "./components/LoadingDotsIcon";
import NotFound from "./components/NotFound";
import Profile from "./components/Profile";
import Terms from "./components/Terms";
const CreatePost = React.lazy(() => import("./components/CreatePost"));
const ViewSinglePost = React.lazy(() => import("./components/ViewSinglePost"));
const Search = React.lazy(() => import("./components/Search"));
const Chat = React.lazy(() => import("./components/Chat"));

function Main() {
  const initialState = {
    loggedIn: Boolean(localStorage.getItem("appToken")),
    flashMessages: [],
    user: {
      token: localStorage.getItem("appToken"),
      username: localStorage.getItem("appUsername"),
      avatar: localStorage.getItem("appAvatar"),
    },
    isSearchOpen: false,
    isChatOpen: false,
    unreadChatCount: 0,
  };

  function ourReducer(draft, action) {
    switch (action.type) {
      case "login":
        draft.loggedIn = true;
        draft.user = action.data;
        return;
      case "logout":
        draft.loggedIn = false;
        return;
      case "flashMessage":
        draft.flashMessages.push(action.value);
        return;
      case "openSearch":
        draft.isSearchOpen = true;
        return;
      case "closeSearch":
        draft.isSearchOpen = false;
        return;
      case "toggleChat":
        draft.isChatOpen = !draft.isChatOpen;
        return;
      case "closeChat":
        draft.isChatOpen = false;
        return;
      case "incrementUnreadChatCount":
        draft.unreadChatCount++;
        return;
      case "clearUnreadChatCount":
        draft.unreadChatCount = 0;
        return;
    }
  }

  const [state, dispatch] = useImmerReducer(ourReducer, initialState);
  useEffect(() => {
    if (state.loggedIn) {
      localStorage.setItem("appToken", state.user.token);
      localStorage.setItem("appUsername", state.user.username);
      localStorage.setItem("appAvatar", state.user.avatar);
    } else {
      localStorage.removeItem("appToken");
      localStorage.removeItem("appUsername");
      localStorage.removeItem("appAvatar");
    }
  }, [state.loggedIn]);

  // Check if token has expired or not on first render
  useEffect(() => {
    if (state.loggedIn) {
      const ourRequest = Axios.CancelToken.source();
      async function fetchResults() {
        try {
          const response = await Axios.post(
            "/checkToken",
            { token: state.user.token },
            { cancelToken: ourRequest.token }
          );
          if (!response.data) {
            dispatch({ type: "logout" });
            dispatch({
              type: "flashMessage",
              value: "Your session has expired. Please log in again.",
            });
          }
        } catch (e) {
          console.log("Problem with fetch results...");
        }
      }
      fetchResults();
      return () => ourRequest.cancel();
    }
  }, []);

  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>
        <BrowserRouter>
          <FlashMessages messages={state.flashMessages} />
          <Header />
          <Suspense fallback={<LoadingDotsIcon />}>
            <Switch>
              <Route path="/profile/:username">
                <Profile />
              </Route>
              <Route path="/" exact>
                {state.loggedIn ? <Home /> : <HomeGuest />}
              </Route>
              <Route path="/post/:id" exact>
                <ViewSinglePost />
              </Route>
              <Route path="/post/:id/edit" exact>
                <EditPost />
              </Route>
              <Route path="/create-post">
                <CreatePost />
              </Route>
              <Route path="/about-us" exact>
                <About />
              </Route>
              <Route path="/terms" exact>
                <Terms />
              </Route>
              <Route>
                <NotFound />
              </Route>
            </Switch>
          </Suspense>
          <CSSTransition
            timeout={330}
            in={state.isSearchOpen}
            classNames="search-overlay"
            unmountOnExit
          >
            <div className="search-overlay">
              <Suspense fallback="">
                <Search />
              </Suspense>
            </div>
          </CSSTransition>
          <Suspense fallback="">{state.loggedIn && <Chat />}</Suspense>
          <Footer />
        </BrowserRouter>
      </DispatchContext.Provider>
    </StateContext.Provider>
  );
}

ReactDOM.render(<Main />, document.querySelector("#app"));
