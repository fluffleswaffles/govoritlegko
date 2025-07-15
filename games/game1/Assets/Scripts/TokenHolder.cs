using UnityEngine;

public class TokenHolder : MonoBehaviour
{
    public static TokenHolder Instance;
    public string JwtToken;

    private void Awake()
    {
        Debug.Log("0. TokenHolder запущен!");

        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);
            Debug.Log("5. TokenHolder создан и сохранён.");
        }
        else
        {
            Debug.Log("6. Удаляем дубликат TokenHolder.");
            Destroy(gameObject);
        }
    }
}