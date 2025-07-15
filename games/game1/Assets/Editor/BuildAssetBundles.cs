using UnityEditor;
using UnityEngine;
using System.IO;

public class BuildAssetBundles
{
    [MenuItem("Tools/Build Character AssetBundle")]
    public static void BuildCharacterBundle()
    {
        // Папка с ассетами
        string assetsPath = "Assets/AssetBundleBuild";
        string bundleName = "characterbundle";

        // Назначаем все ассеты в этой папке в один AssetBundle
        string[] assetPaths = AssetDatabase.FindAssets("", new[] { assetsPath });
        foreach (string guid in assetPaths)
        {
            string path = AssetDatabase.GUIDToAssetPath(guid);
            AssetImporter importer = AssetImporter.GetAtPath(path);
            if (importer != null)
            {
                importer.assetBundleName = bundleName;
            }
        }

        // Папка, куда будут собраны бандлы
        string outputPath = "AssetBundles";
        if (!Directory.Exists(outputPath))
            Directory.CreateDirectory(outputPath);

        // Сборка AssetBundle
        BuildPipeline.BuildAssetBundles(outputPath, BuildAssetBundleOptions.None, BuildTarget.WebGL); // Или другой BuildTarget, если нужно

        Debug.Log("AssetBundle собран успешно в " + outputPath);
    }
}
