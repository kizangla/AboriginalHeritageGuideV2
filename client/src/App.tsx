import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import MapPage from "@/pages/map";
import BusinessSearchPage from "@/pages/business-search";
import TerritoryPage from "@/pages/territory";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={MapPage} />
      <Route path="/map" component={MapPage} />
      <Route path="/business-search" component={BusinessSearchPage} />
      <Route path="/territory/:territoryName" component={TerritoryPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
