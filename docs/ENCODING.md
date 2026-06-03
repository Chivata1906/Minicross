# Codificacion UTF-8

Este proyecto debe guardarse siempre en **UTF-8** (sin BOM). En Windows, algunos editores guardan por error en UTF-16 y rompen `npm`, Git y GitHub Actions.

## Configuracion del editor

| Archivo | Proposito |
|---------|-----------|
| [.editorconfig](../.editorconfig) | `charset = utf-8` para Editores compatibles |
| [.vscode/settings.json](../.vscode/settings.json) | Cursor y VS Code: `files.encoding = utf8` |

Tras clonar el repo, abre la carpeta en Cursor/VS Code; la configuracion de `.vscode` se aplica automaticamente.

## Comandos

```bash
# Comprobar que no haya UTF-16
npm run check:encoding

# Convertir archivos detectados a UTF-8
npm run fix:encoding
```

`npm run build` ejecuta la comprobacion antes de compilar (`prebuild`).

El hook **pre-commit** tambien bloquea commits si queda algun archivo en UTF-16.

## Si un archivo se corrompe otra vez

1. `npm run fix:encoding`
2. En Cursor: barra inferior → codificacion → **Save with Encoding** → **UTF-8**
3. Vuelve a ejecutar `npm run check:encoding`
