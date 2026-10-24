package com.tcglab.next.data

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.nio.charset.StandardCharsets
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.spec.GCMParameterSpec

/**
 * Stores the user-provided xAI key encrypted with an Android Keystore AES-GCM key.
 * The encrypted value is kept in the app-private preferences and is never logged.
 */
class SecureKeyStore(context: Context) {
    private val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun get(): String? {
        val encrypted = prefs.getString(ENCRYPTED_KEY, null)
        if (!encrypted.isNullOrBlank()) {
            return decrypt(encrypted)
        }

        // One-time migration from the previous plaintext implementation.
        val legacy = prefs.getString(LEGACY_KEY, null)?.takeIf { it.isNotBlank() }
        if (legacy != null) {
            put(legacy)
            prefs.edit().remove(LEGACY_KEY).apply()
        }
        return legacy
    }

    fun put(value: String) {
        val trimmed = value.trim()
        if (trimmed.isBlank()) {
            clear()
            return
        }
        prefs.edit().putString(ENCRYPTED_KEY, encrypt(trimmed)).remove(LEGACY_KEY).apply()
    }

    fun clear() {
        prefs.edit().remove(ENCRYPTED_KEY).remove(LEGACY_KEY).apply()
    }

    private fun key(): javax.crypto.SecretKey {
        val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
        val existing = keyStore.getKey(KEY_ALIAS, null)
        if (existing is javax.crypto.SecretKey) return existing

        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE)
        generator.init(
            KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setUserAuthenticationRequired(false)
                .build()
        )
        return generator.generateKey()
    }

    private fun encrypt(value: String): String {
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, key())
        val iv = cipher.iv
        val ciphertext = cipher.doFinal(value.toByteArray(StandardCharsets.UTF_8))
        return Base64.encodeToString(iv, Base64.NO_WRAP) + ":" +
            Base64.encodeToString(ciphertext, Base64.NO_WRAP)
    }

    private fun decrypt(value: String): String? {
        return runCatching {
            val parts = value.split(':', limit = 2)
            require(parts.size == 2)
            val iv = Base64.decode(parts[0], Base64.NO_WRAP)
            val ciphertext = Base64.decode(parts[1], Base64.NO_WRAP)
            val cipher = Cipher.getInstance(TRANSFORMATION)
            cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, iv))
            String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8)
        }.getOrNull()
    }

    private companion object {
        const val PREFS = "tcg_lab_ai"
        const val LEGACY_KEY = "xai_key"
        const val ENCRYPTED_KEY = "xai_key_encrypted"
        const val KEY_ALIAS = "tcg_lab_xai_key"
        const val ANDROID_KEYSTORE = "AndroidKeyStore"
        const val TRANSFORMATION = "AES/GCM/NoPadding"
    }
}
