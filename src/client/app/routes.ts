import { index, route } from "@react-router/dev/routes";

export default [
    index("routes/Home.jsx"),
    route("interactor", "routes/Interactor.jsx"),
    route("dashboard", "routes/Dashboard.jsx", [
        route("characters", "routes/dashboard/Characters.jsx"),
        route("background", "routes/dashboard/ChangeBackground.jsx"),
        route("soundpad", "routes/dashboard/ChangeSounds.jsx"),
        route("music", "routes/dashboard/ChangeMusic.jsx"),
    ]),
    route("scene", "routes/Scene.jsx"),
];
