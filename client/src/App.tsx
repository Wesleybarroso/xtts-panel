import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import ModulePage from "./pages/ModulePage";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/dashboard"} component={Home} />
      <Route path={"/tts"}>{() => <ModulePage path="/tts" />}</Route>
      <Route path={"/jobs"}>{() => <ModulePage path="/jobs" />}</Route>
      <Route path={"/voices"}>{() => <ModulePage path="/voices" />}</Route>
      <Route path={"/servers"}>{() => <ModulePage path="/servers" />}</Route>
      <Route path={"/api-keys"}>{() => <ModulePage path="/api-keys" />}</Route>
      <Route path={"/webhooks"}>{() => <ModulePage path="/webhooks" />}</Route>
      <Route path={"/integrations"}>{() => <ModulePage path="/integrations" />}</Route>
      <Route path={"/stats"}>{() => <ModulePage path="/stats" />}</Route>
      <Route path={"/logs"}>{() => <ModulePage path="/logs" />}</Route>
      <Route path={"/users"}>{() => <ModulePage path="/users" />}</Route>
      <Route path={"/settings"}>{() => <ModulePage path="/settings" />}</Route>
      <Route path={"/docs"}>{() => <ModulePage path="/docs" />}</Route>
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
