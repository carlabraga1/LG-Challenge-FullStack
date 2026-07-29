import { Route, Routes } from "react-router-dom";
import { RootLayout } from "@/layouts/RootLayout";
import Home from "@/pages/Home";
import MovieDetails from "@/pages/MovieDetails";
import Favorites from "@/pages/Favorites";
import NotFound from "@/pages/NotFound";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route index element={<Home />} />
        <Route path="movies/:id" element={<MovieDetails />} />
        <Route path="favorites" element={<Favorites />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
