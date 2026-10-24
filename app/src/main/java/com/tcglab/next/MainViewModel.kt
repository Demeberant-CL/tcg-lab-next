package com.tcglab.next

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.tcglab.next.data.Catalog
import com.tcglab.next.data.CatalogCard
import com.tcglab.next.data.CollectionCard
import com.tcglab.next.data.DeckSummary
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class AppState(
    val loading: Boolean = true,
    val collection: List<CollectionCard> = emptyList(),
    val decks: List<DeckSummary> = emptyList(),
    val catalog: List<CatalogCard> = emptyList(),
    val error: String? = null
)

class MainViewModel(application: Application) : AndroidViewModel(application) {
    private val database get() = DatabaseHolder.db
    private val _state = MutableStateFlow(AppState())
    val state: StateFlow<AppState> = _state.asStateFlow()

    init {
        load()
    }

    fun load() {
        viewModelScope.launch(Dispatchers.IO) {
            runCatching {
                Catalog.load(getApplication<Application>().applicationContext)
                AppState(
                    loading = false,
                    collection = database.getCards(),
                    decks = database.getDecks(),
                    catalog = Catalog.allCards()
                )
            }.onSuccess { _state.value = it }
                .onFailure { error ->
                    _state.value = _state.value.copy(
                        loading = false,
                        error = error.message ?: "No se pudieron cargar los datos."
                    )
                }
        }
    }

    fun refreshCollection() {
        viewModelScope.launch(Dispatchers.IO) {
            runCatching { database.getCards() }
                .onSuccess { cards -> _state.value = _state.value.copy(collection = cards, error = null) }
                .onFailure { error -> _state.value = _state.value.copy(error = error.message ?: "No se pudo cargar la colección.") }
        }
    }

    fun refreshDecks() {
        viewModelScope.launch(Dispatchers.IO) {
            runCatching { database.getDecks() }
                .onSuccess { decks -> _state.value = _state.value.copy(decks = decks, error = null) }
                .onFailure { error -> _state.value = _state.value.copy(error = error.message ?: "No se pudieron cargar los mazos.") }
        }
    }
}
