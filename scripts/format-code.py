#!/usr/bin/env python3
"""
Script para formatação avançada de código Python
Remove espaços extras, quebra linhas longas e aplica formatação consistente
"""

import os
import re
import subprocess
import sys
from pathlib import Path
from typing import List


def remove_trailing_whitespace(file_path: Path) -> bool:
    """Remove espaços em branco no final das linhas."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Remove espaços no final de cada linha
        lines = content.splitlines()
        cleaned_lines = [line.rstrip() for line in lines]
        
        # Remove linhas vazias excessivas (máximo 2 consecutivas)
        final_lines = []
        empty_count = 0
        
        for line in cleaned_lines:
            if line.strip() == '':
                empty_count += 1
                if empty_count <= 2:
                    final_lines.append(line)
            else:
                empty_count = 0
                final_lines.append(line)
        
        # Garante que termina com quebra de linha
        new_content = '\n'.join(final_lines)
        if new_content and not new_content.endswith('\n'):
            new_content += '\n'
        
        # Remove linhas vazias no início do arquivo
        new_content = new_content.lstrip('\n')
        
        # Escreve arquivo apenas se houver mudanças
        if content != new_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            return True
        
        return False
    except Exception as e:
        print(f"Erro ao processar {file_path}: {e}")
        return False


def break_long_lines(file_path: Path, max_length: int = 88) -> bool:
    """Quebra linhas muito longas que não foram quebradas pelo black."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        lines = content.splitlines()
        modified = False
        new_lines = []
        
        for line in lines:
            if len(line) > max_length:
                # Detectar comentários longos
                if line.strip().startswith('#'):
                    # Quebrar comentários longos
                    indent = len(line) - len(line.lstrip())
                    comment_part = line.strip()[1:].strip()
                    words = comment_part.split()
                    
                    current_line = ' ' * indent + '#'
                    for word in words:
                        if len(current_line + ' ' + word) <= max_length:
                            current_line += ' ' + word
                        else:
                            new_lines.append(current_line)
                            current_line = ' ' * indent + '# ' + word
                    
                    if current_line.strip() != '#':
                        new_lines.append(current_line)
                    modified = True
                
                # Detectar strings longas
                elif '"""' in line or "'''" in line:
                    # Não quebrar docstrings, deixar para o black
                    new_lines.append(line)
                
                else:
                    # Para outras linhas longas, deixar o black decidir
                    new_lines.append(line)
            else:
                new_lines.append(line)
        
        if modified:
            new_content = '\n'.join(new_lines)
            if not new_content.endswith('\n'):
                new_content += '\n'
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            return True
        
        return False
    except Exception as e:
        print(f"Erro ao quebrar linhas em {file_path}: {e}")
        return False


def run_command(cmd: List[str], cwd: Path = None) -> bool:
    """Executa um comando e retorna se foi bem-sucedido."""
    try:
        result = subprocess.run(
            cmd,
            cwd=cwd,
            capture_output=True,
            text=True,
            check=False
        )
        
        if result.returncode != 0:
            print(f"Comando falhou: {' '.join(cmd)}")
            if result.stderr:
                print(f"Erro: {result.stderr}")
            return False
        
        return True
    except Exception as e:
        print(f"Erro ao executar comando {' '.join(cmd)}: {e}")
        return False


def format_python_files(src_dir: Path, max_line_length: int = 88) -> None:
    """Formata todos os arquivos Python no diretório."""
    python_files = list(src_dir.rglob("*.py"))
    
    if not python_files:
        print("Nenhum arquivo Python encontrado.")
        return
    
    print(f"Encontrados {len(python_files)} arquivos Python para formatação.")
    
    # Etapa 1: Limpeza inicial
    print("\n🔧 Etapa 1: Removendo espaços em branco...")
    cleaned_files = 0
    for file_path in python_files:
        if remove_trailing_whitespace(file_path):
            cleaned_files += 1
    
    print(f"   Arquivos limpos: {cleaned_files}")
    
    # Etapa 2: Quebrar linhas longas (comentários)
    print("\n📏 Etapa 2: Quebrando linhas longas...")
    broken_files = 0
    for file_path in python_files:
        if break_long_lines(file_path, max_line_length):
            broken_files += 1
    
    print(f"   Arquivos modificados: {broken_files}")
    
    # Etapa 3: isort
    print("\n📝 Etapa 3: Organizando imports com isort...")
    if run_command(["isort", str(src_dir), "--profile", "black"], cwd=src_dir.parent):
        print("   ✅ isort executado com sucesso")
    else:
        print("   ❌ Erro no isort")
    
    # Etapa 4: black
    print("\n⚫ Etapa 4: Formatando com black...")
    if run_command(["black", str(src_dir), f"--line-length={max_line_length}"], cwd=src_dir.parent):
        print("   ✅ black executado com sucesso")
    else:
        print("   ❌ Erro no black")
    
    # Etapa 5: autopep8 (para correções extras)
    print("\n🔧 Etapa 5: Aplicando correções extras com autopep8...")
    if run_command([
        "autopep8", 
        "--in-place", 
        "--recursive", 
        f"--max-line-length={max_line_length}",
        "--aggressive",
        "--aggressive",
        str(src_dir)
    ], cwd=src_dir.parent):
        print("   ✅ autopep8 executado com sucesso")
    else:
        print("   ❌ Erro no autopep8")
    
    # Etapa 6: Limpeza final
    print("\n🧹 Etapa 6: Limpeza final...")
    final_cleaned = 0
    for file_path in python_files:
        if remove_trailing_whitespace(file_path):
            final_cleaned += 1
    
    print(f"   Arquivos limpos finalmente: {final_cleaned}")
    
    print("\n✅ Formatação completa concluída!")


def main():
    """Função principal."""
    if len(sys.argv) > 1:
        src_path = Path(sys.argv[1])
    else:
        src_path = Path("src")
    
    if not src_path.exists():
        print(f"Diretório {src_path} não encontrado.")
        sys.exit(1)
    
    max_length = 88
    if len(sys.argv) > 2:
        try:
            max_length = int(sys.argv[2])
        except ValueError:
            print("Comprimento máximo de linha deve ser um número.")
            sys.exit(1)
    
    print(f"🚀 Iniciando formatação do diretório: {src_path}")
    print(f"📏 Comprimento máximo de linha: {max_length}")
    
    format_python_files(src_path, max_length)


if __name__ == "__main__":
    main()