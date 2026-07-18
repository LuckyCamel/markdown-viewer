use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

use serde::de::DeserializeOwned;
use tauri::{AppHandle, Manager};
use tauri::State;

pub struct StoreState {
    data: Mutex<HashMap<String, serde_json::Value>>,
    path: PathBuf,
}

impl StoreState {
    /**
     * 从 app data 目录加载 settings.json
     */
    fn load(app: &AppHandle) -> Result<Self, String> {
        let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
        fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
        let path = dir.join("settings.json");
        let data = if path.exists() {
            let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
            serde_json::from_str(&content).unwrap_or_default()
        } else {
            HashMap::new()
        };
        Ok(Self {
            data: Mutex::new(data),
            path,
        })
    }

    /**
     * 持久化到磁盘
     */
    fn save(&self) -> Result<(), String> {
        let data = self.data.lock().unwrap();
        let content = serde_json::to_string_pretty(&*data).map_err(|e| e.to_string())?;
        fs::write(&self.path, content).map_err(|e| e.to_string())
    }

    /**
     * 类型安全的读取接口：按 key 取值并反序列化为指定类型
     *
     * 用于 `FileFilters::from_store` 读取 ignore_list / markdown_extensions。
     * 不存在时返回 `Ok(None)`，由调用方应用默认值。
     */
    pub fn get<T: DeserializeOwned>(&self, key: &str) -> Result<Option<T>, String> {
        let data = self.data.lock().unwrap();
        match data.get(key) {
            Some(value) => {
                let typed: T = serde_json::from_value(value.clone()).map_err(|e| e.to_string())?;
                Ok(Some(typed))
            }
            None => Ok(None),
        }
    }

    /**
     * 测试辅助：从已有 HashMap 构造 StoreState
     *
     * 仅在 cfg(test) 下可用，避免测试代码访问私有字段。
     */
    #[cfg(test)]
    pub(crate) fn from_map_for_test(data: HashMap<String, serde_json::Value>) -> Self {
        Self {
            data: Mutex::new(data),
            path: PathBuf::new(),
        }
    }
}

/**
 * 初始化 StoreState 供 Tauri manage
 */
pub fn init_store(app: &AppHandle) -> Result<StoreState, String> {
    StoreState::load(app)
}

/**
 * 读取单个设置项
 */
#[tauri::command]
pub async fn get_setting(
    key: String,
    store: State<'_, StoreState>,
) -> Result<Option<serde_json::Value>, String> {
    let data = store.data.lock().unwrap();
    Ok(data.get(&key).cloned())
}

/**
 * 写入单个设置项
 */
#[tauri::command]
pub async fn set_setting(
    key: String,
    value: serde_json::Value,
    store: State<'_, StoreState>,
) -> Result<(), String> {
    {
        let mut data = store.data.lock().unwrap();
        data.insert(key, value);
    }
    store.save()
}

/**
 * 批量导入设置（localStorage 迁移）
 */
#[tauri::command]
pub async fn migrate_settings(
    entries: HashMap<String, serde_json::Value>,
    store: State<'_, StoreState>,
) -> Result<(), String> {
    {
        let mut data = store.data.lock().unwrap();
        for (key, value) in entries {
            data.entry(key).or_insert(value);
        }
    }
    store.save()
}
