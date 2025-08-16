"""
Patch para corrigir incompatibilidade entre bcrypt 4.x e passlib 1.7.4
Este patch evita o warning sobre bcrypt.__about__ que não existe mais.
"""


def patch_bcrypt_passlib():
    """
    Aplica patch para corrigir incompatibilidade entre bcrypt e passlib.

    O bcrypt 4.x removeu o módulo __about__, mas passlib ainda tenta acessá-lo.
    Este patch cria um mock do __about__ para evitar o warning.
    """
    try:
        import bcrypt

        # Criar um módulo __about__ falso se não existir
        if not hasattr(bcrypt, "__about__"):

            class About:
                __version__ = (
                    bcrypt.__version__ if hasattr(bcrypt, "__version__") else "4.3.0"
                )

            bcrypt.__about__ = About()

    except ImportError:
        # bcrypt não está instalado, não há nada para corrigir
        pass
    except Exception:
        # Qualquer outro erro, ignorar silenciosamente
        pass


# Aplicar o patch automaticamente quando o módulo for importado
patch_bcrypt_passlib()
