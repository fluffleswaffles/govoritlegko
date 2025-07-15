using UnityEngine;

public class CharacterTokenSaver : MonoBehaviour
{
    [SerializeField] 
    private string _jwtToken;
    public string JwtToken
    {
        get => _jwtToken;
        set => _jwtToken = value;
    }

    private void Start()
    {
        if (string.IsNullOrEmpty(_jwtToken)){
            Debug.LogError("JWT Token не назначен в инспекторе!");
            return;
        }
        if (TokenHolder.Instance == null){
            var holderObj = new GameObject("TokenHolder");
            holderObj.AddComponent<TokenHolder>();
        }

        TokenHolder.Instance.JwtToken = _jwtToken;
        Debug.Log($"Токен сохранен: {_jwtToken}");
    }
}
