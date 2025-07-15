using UnityEditor;
using UnityEngine;
using System.IO;

public class BuildAssetBundles
{
    [MenuItem("Tools/Build Character AssetBundle")]
    public static void BuildCharacterBundle()
    {
        string assetsPath = "Assets/AssetBundleBuild";
        string bundleName = "characterbundle";
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
        string outputPath = "AssetBundles";
        if (!Directory.Exists(outputPath))
            Directory.CreateDirectory(outputPath);
        BuildPipeline.BuildAssetBundles(outputPath, BuildAssetBundleOptions.None, BuildTarget.WebGL);

        Debug.Log("AssetBundle собран успешно в " + outputPath);
    }
}
