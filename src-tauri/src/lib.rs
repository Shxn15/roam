use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // SQLite access for the frontend; the schema is migrated from TypeScript (src/db/migrations.ts).
        .plugin(tauri_plugin_sql::Builder::default().build())
        .setup(|app| {
            // Everything Roam stores lives in the app data folder: roam.db and images/.
            let data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(data_dir.join("images"))?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Roam");
}
