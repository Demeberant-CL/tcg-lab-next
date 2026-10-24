package com.tcglab.next

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tcglab.next.data.AiDeckClient
import com.tcglab.next.data.AiDeckProposal
import com.tcglab.next.data.CollectionCard
import com.tcglab.next.data.TcgDatabase
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

data class StrategyState(
    val busy: Boolean = false,
    val message: String? = null,
    val proposal: AiDeckProposal? = null,
    val explanation: String? = null
)

class StrategyViewModel : ViewModel() {
    private val _state = MutableStateFlow(StrategyState())
    val state: StateFlow<StrategyState> = _state.asStateFlow()

    fun generate(holdings: List<CollectionCard>, aiClient: AiDeckClient, goal: String, key: String) {
        if (_state.value.busy) return
        if (!aiClient.hasKey()) aiClient.saveKey(key)
        _state.value = StrategyState(busy = true)
        viewModelScope.launch {
            aiClient.generate(holdings, com.tcglab.next.data.Catalog.allCards(), goal)
                .onSuccess {
                    _state.value = StrategyState(
                        message = "Propuesta lista para revisar.",
                        proposal = it,
                        explanation = it.explanation
                    )
                }
                .onFailure {
                    _state.value = StrategyState(message = it.message ?: "No se pudo generar la propuesta.")
                }
        }
    }

    fun saveProposal(database: TcgDatabase, onSaved: () -> Unit) {
        val proposal = _state.value.proposal ?: return
        viewModelScope.launch(Dispatchers.IO) {
            runCatching { database.saveDeck(proposal.deck) }
                .onSuccess {
                    _state.value = _state.value.copy(
                        message = "Mazo guardado: ${proposal.deck.name}",
                        proposal = null
                    )
                    withContext(Dispatchers.Main) { onSaved() }
                }
                .onFailure {
                    _state.value = _state.value.copy(
                        message = it.message ?: "No se pudo guardar el mazo."
                    )
                }
        }
    }

    fun clearProposal() {
        _state.value = _state.value.copy(proposal = null, explanation = null)
    }
}
