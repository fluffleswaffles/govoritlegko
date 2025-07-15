using System.Collections;
using UnityEngine;
using UnityEngine.Networking;
using UnityEngine.UI;

public class CoinRewardSender : MonoBehaviour
{
    [Header("Параметры запроса")]
    public int coins = 20;
    public string JWTtoken = "вставь_токен_сюда";
    public string rewardKey = "test-reward-123";

    [Header("UI элементы")]
    public Button rewardButton;
    public Text statusText;

    private void Start()
    {
        if (rewardButton != null)
            rewardButton.onClick.AddListener(SendCoins);
    }

    public void SendCoins()
    {
        StartCoroutine(SendCoinsCoroutine());
    }

    private IEnumerator SendCoinsCoroutine()
    {
        statusText.text = "Отправка запроса...";

        string url = "http://localhost:5000/api/game/send-coins";
        string jsonData = JsonUtility.ToJson(new CoinRequest
        {
            coins = coins,
            rewardKey = rewardKey
        });
        byte[] bodyRaw = System.Text.Encoding.UTF8.GetBytes(jsonData);

        UnityWebRequest request = new UnityWebRequest(url, "POST");
        request.uploadHandler = new UploadHandlerRaw(bodyRaw);
        request.downloadHandler = new DownloadHandlerBuffer();
        request.SetRequestHeader("Content-Type", "application/json");
        request.SetRequestHeader("Authorization", "Bearer " + JWTtoken);

        yield return request.SendWebRequest();

#if UNITY_2020_1_OR_NEWER
        if (request.result == UnityWebRequest.Result.Success)
#else
        if (!request.isNetworkError && !request.isHttpError)
#endif
        {
            statusText.text = "Успех: " + request.downloadHandler.text;
        }
        else
        {
            statusText.text = "Ошибка: " + request.error + "\n" + request.downloadHandler.text;
        }
    }
    [System.Serializable]
    private class CoinRequest
    {
        public int coins;
        public string rewardKey;
    }
}
