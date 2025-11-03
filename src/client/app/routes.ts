import { index, route } from "@react-router/dev/routes";

export default [
    index("routes/Home.jsx"),
    route("interactor", "routes/Interactor.jsx"),
    route("dashboard", "routes/Dashboard.jsx", [
        route("background", "routes/dashboard/ChangeBackground.jsx"),
        route("test", "routes/dashboard/AudioTest.jsx"),
    ]),
    route("scene", "routes/Scene.jsx"),
];
