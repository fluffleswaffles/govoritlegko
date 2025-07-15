using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using UnityEngine;
using UnityEngine.Networking;
using UnityEngine.SceneManagement;

public class CharacterLoader : MonoBehaviour
{
    public string assetBundleUrl = "http://localhost:5000/assets/characterbundle";

    [SerializeField]
    private string jwtToken = "your.jwt.token.here";

    [SerializeField]
    private bool debugMode = true;

    public string nextSceneName = "GameScene";

    public SkinnedMeshRenderer topRenderer;
    public SkinnedMeshRenderer bottomRenderer;
    public SkinnedMeshRenderer hairRenderer;
    public Renderer faceRenderer;

    private Dictionary<string, Mesh> loadedMeshes = new Dictionary<string, Mesh>();
    private Dictionary<string, Texture2D> loadedTextures = new Dictionary<string, Texture2D>();
    private bool allItemsLoaded = false;

#if UNITY_WEBGL && !UNITY_EDITOR
    [System.Runtime.InteropServices.DllImport("__Internal")]
    private static extern string GetJwtFromCookies();
#endif

    private async void Start()
    {
        string finalToken = GetJwt();
        if (string.IsNullOrEmpty(finalToken))
        {
            Debug.LogError("JWT токен не найден. Проверь cookie или debugMode.");
            return;
        }

        jwtToken = finalToken;

        await LoadAssetBundle();

        var equippedItems = await GetEquippedItemsFromServer();
        if (equippedItems == null)
        {
            Debug.LogError("Не удалось получить данные персонажа.");
            return;
        }

        ApplyEquippedItems(equippedItems);

        if (allItemsLoaded)
        {
            DontDestroyOnLoad(gameObject);
            LoadNextScene();
        }
        else
        {
            Debug.LogError("Не все предметы персонажа были загружены корректно");
        }
    }

    string GetJwt()
    {
#if UNITY_WEBGL && !UNITY_EDITOR
        string jwtFromCookie = GetJwtFromCookies();
        if (!string.IsNullOrEmpty(jwtFromCookie))
        {
            Debug.Log("JWT получен из cookie");
            return jwtFromCookie;
        }
        else if (debugMode)
        {
            Debug.LogWarning("JWT не найден в cookie. Используется debug fallback.");
            return jwtToken;
        }
        else
        {
            Debug.LogError("JWT не найден и debugMode отключен.");
            return null;
        }
#else
        return jwtToken;
#endif
    }

    async Task LoadAssetBundle()
    {
        using (UnityWebRequest uwr = UnityWebRequestAssetBundle.GetAssetBundle(assetBundleUrl))
        {
            var operation = uwr.SendWebRequest();
            while (!operation.isDone)
                await Task.Yield();

            if (uwr.result != UnityWebRequest.Result.Success)
            {
                Debug.LogError("Ошибка загрузки AssetBundle: " + uwr.error);
                return;
            }

            AssetBundle bundle = DownloadHandlerAssetBundle.GetContent(uwr);
            if (bundle == null)
            {
                Debug.LogError("AssetBundle не загружен.");
                return;
            }

            Mesh[] meshes = bundle.LoadAllAssets<Mesh>();
            foreach (var mesh in meshes)
            {
                loadedMeshes[mesh.name] = mesh;
                Debug.Log($"Загружен меш: {mesh.name}");
            }

            Texture2D[] textures = bundle.LoadAllAssets<Texture2D>();
            foreach (var texture in textures)
            {
                loadedTextures[texture.name] = texture;
                Debug.Log($"Загружена текстура: {texture.name}");
            }

            bundle.Unload(false);
        }
    }

    void ApplyEquippedItems(Dictionary<string, string> equippedItems)
    {
        allItemsLoaded = true;

        allItemsLoaded &= ApplyItem(topRenderer, equippedItems, "top");
        allItemsLoaded &= ApplyItem(bottomRenderer, equippedItems, "bottom");
        allItemsLoaded &= ApplyItem(hairRenderer, equippedItems, "hair");
        allItemsLoaded &= ApplyItem(faceRenderer, equippedItems, "face", applyMesh: false);

        Debug.Log(allItemsLoaded ? "Все предметы успешно загружены" : "Были ошибки при загрузке предметов");
    }

    bool ApplyItem(Renderer renderer, Dictionary<string, string> equippedItems, string itemType, bool applyMesh = true)
    {
        if (renderer == null)
        {
            Debug.LogWarning($"Renderer для {itemType} не назначен");
            return false;
        }

        if (!equippedItems.ContainsKey(itemType))
        {
            Debug.Log($"У игрока отсутствует предмет типа {itemType}, сбрасываем...");
            if (renderer is SkinnedMeshRenderer skinnedRenderer && applyMesh)
            {
                skinnedRenderer.sharedMesh = null;
            }
            renderer.material.mainTexture = null;
            return true;
        }

        string itemId = equippedItems[itemType];
        bool success = true;

        if (applyMesh && renderer is SkinnedMeshRenderer sr)
        {
            string meshName = $"{itemId}-{itemType}";
            if (loadedMeshes.TryGetValue(meshName, out Mesh mesh))
            {
                sr.sharedMesh = mesh;
                Debug.Log($"Применён меш: {meshName}");
            }
            else
            {
                Debug.LogWarning($"Меш {meshName} не найден");
                success = false;
            }
        }

        string textureName = $"{itemId}-tex";
        if (loadedTextures.TryGetValue(textureName, out Texture2D texture))
        {
            renderer.material.mainTexture = texture;
            Debug.Log($"Применена текстура: {textureName} для {itemType}");
        }
        else
        {
            Debug.LogWarning($"Текстура {textureName} не найдена для {itemType}");
            success = false;
        }

        return success;
    }

    void LoadNextScene()
    {
        if (!string.IsNullOrEmpty(nextSceneName))
        {
            Debug.Log($"Переход на сцену: {nextSceneName}");
            SceneManager.LoadScene(nextSceneName);
        }
        else
        {
            Debug.LogWarning("Название следующей сцены не указано");
        }
    }

    async Task<Dictionary<string, string>> GetEquippedItemsFromServer()
    {
        try
        {
            using (var client = new HttpClient())
            {
                client.BaseAddress = new System.Uri("http://localhost:5000/");
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", jwtToken);

                HttpResponseMessage response = await client.GetAsync("api/avatar");

                if (!response.IsSuccessStatusCode)
                {
                    Debug.LogError($"Ошибка при запросе /api/avatar: {response.StatusCode}");
                    return null;
                }

                string json = await response.Content.ReadAsStringAsync();
                Debug.Log($"Получен JSON: {json}");

                if (string.IsNullOrEmpty(json))
                {
                    Debug.LogError("Получен пустой JSON ответ");
                    return null;
                }

                var result = new Dictionary<string, string>();
                try
                {
                    var responseData = JsonUtility.FromJson<AvatarResponse>(json);
                    if (responseData == null || responseData.equippedItems == null)
                    {
                        Debug.LogError("Ошибка десериализации: equippedItems = null");
                        return null;
                    }

                    foreach (var item in responseData.equippedItems)
                    {
                        if (item == null) continue;
                        if (item.type == "top" || item.type == "bottom" || item.type == "hair" || item.type == "face")
                        {
                            result[item.type] = item.id.ToString();
                        }
                    }

                    return result;
                }
                catch (System.Exception e)
                {
                    Debug.LogError($"Ошибка десериализации JSON: {e.Message}");
                    return null;
                }
            }
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"Исключение в GetEquippedItemsFromServer: {ex.Message}");
            return null;
        }
    }

    [System.Serializable]
    public class AvatarResponse
    {
        public List<EquippedItem> equippedItems;
    }

    [System.Serializable]
    public class EquippedItem
    {
        public int id;
        public string name;
        public string type;
        public int price;
        public string imageUrl;
        public bool isDefault;
        public string createdAt;
        public string updatedAt;
        public InventoryData Inventory;
    }

    [System.Serializable]
    public class InventoryData
    {
        public bool equipped;
        public string createdAt;
        public string updatedAt;
        public int UserId;
        public int ItemId;
    }
}
